using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

namespace EasyInk.Engine.Services;

internal static class BitmapToEscPos
{
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;
    private const int BAND_HEIGHT_DOTS = 200; // 每个 band 高度，避免超出打印机 buffer

    /// <summary>
    /// 灰度位图 → ESC/POS GS v 0 位图指令序列。
    /// 行主序，MSB=最左。xL/xH = 宽度点数，yL/yH = 高度点数。按 band 分片发送。
    /// </summary>
    public static byte[] Convert(Bitmap grayBitmap)
    {
        int w = grayBitmap.Width;
        int h = grayBitmap.Height;
        int bytesPerRow = (w + 7) / 8;
        var bands = new List<byte[]>();

        for (int startY = 0; startY < h; startY += BAND_HEIGHT_DOTS)
        {
            int bandH = Math.Min(BAND_HEIGHT_DOTS, h - startY);
            bands.Add(BuildBand(grayBitmap, w, bytesPerRow, startY, bandH));
        }

        return Concat(bands);
    }

    public static byte[] CmdInit() => new byte[] { ESC, 0x40, ESC, 0x33, 0x00 };
    public static byte[] CmdCut() => new byte[] { GS, 0x56, 0x42, 0x00 };

    private static byte[] BuildBand(Bitmap src, int w, int bytesPerRow, int startY, int bandHeight)
    {
        // ESC 3 0 + GS v 0 header: xL/xH = width in DOTS, yL/yH = height in DOTS
        const int headerLen = 3 + 8; // ESC 3 0 + GS v 0 header
        int dataLen = bytesPerRow * bandHeight;
        var result = new byte[headerLen + dataLen];
        result[0] = ESC; result[1] = 0x33; result[2] = 0x00; // ESC 3 0
        result[3] = GS;
        result[4] = 0x76;
        result[5] = 0x30;
        result[6] = 0;
        result[7] = (byte)(w & 0xFF);
        result[8] = (byte)((w >> 8) & 0xFF);
        result[9] = (byte)(bandHeight & 0xFF);
        result[10] = (byte)((bandHeight >> 8) & 0xFF);

        var bmpData = src.LockBits(
            new Rectangle(0, startY, w, bandHeight),
            ImageLockMode.ReadOnly,
            PixelFormat.Format24bppRgb);
        var stride = bmpData.Stride;
        var rgb = new byte[stride * bandHeight];
        System.Runtime.InteropServices.Marshal.Copy(bmpData.Scan0, rgb, 0, rgb.Length);
        src.UnlockBits(bmpData);

        for (int row = 0; row < bandHeight; row++)
        {
            int rowBase = headerLen + row * bytesPerRow;
            for (int byteX = 0; byteX < bytesPerRow; byteX++)
            {
                byte val = 0;
                for (int bit = 0; bit < 8; bit++)
                {
                    int srcX = byteX * 8 + bit;
                    if (srcX >= w) break;
                    int offset = row * stride + srcX * 3;
                    if (rgb[offset] < 128)
                        val |= (byte)(0x80 >> bit);
                }
                result[rowBase + byteX] = val;
            }
        }

        return result;
    }

    private static byte[] Concat(List<byte[]> arrays)
    {
        int totalLen = 0;
        foreach (var a in arrays) totalLen += a.Length;
        var result = new byte[totalLen];
        int offset = 0;
        foreach (var a in arrays)
        {
            Buffer.BlockCopy(a, 0, result, offset, a.Length);
            offset += a.Length;
        }
        return result;
    }
}
