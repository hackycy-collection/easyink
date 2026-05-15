using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

namespace EasyInk.Engine.Services;

internal static class BitmapToEscPos
{
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;
    private const int BAND_HEIGHT_DOTS = 960; // 每个 band 高度，匹配 python-escpos 默认值

    /// <summary>
    /// 灰度位图 → ESC/POS GS v 0 位图指令序列（按 band 分片，每片独立发送）。
    /// 行主序，MSB=最左。xL/xH = 每行字节数，yL/yH = 高度点数。
    /// </summary>
    public static List<byte[]> ConvertToBands(Bitmap grayBitmap)
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

        return bands;
    }

    public static byte[] CmdInit() => new byte[] { ESC, 0x40, ESC, 0x33, 0x00 };
    public static byte[] CmdCut() => new byte[] { GS, 0x56, 0x01 };

    private static byte[] BuildBand(Bitmap src, int w, int bytesPerRow, int startY, int bandHeight)
    {
        // GS v 0 header: xL/xH = width in DOTS, yL/yH = height in DOTS
        // 国产热敏打印机（XP-80C 等）按点数解读 x，与 Epson 原厂（字节数）不同
        const int headerLen = 8;
        int dataLen = bytesPerRow * bandHeight;
        var result = new byte[headerLen + dataLen];
        result[0] = GS;
        result[1] = 0x76;
        result[2] = 0x30;
        result[3] = 0;
        result[4] = (byte)(w & 0xFF);
        result[5] = (byte)((w >> 8) & 0xFF);
        result[6] = (byte)(bandHeight & 0xFF);
        result[7] = (byte)((bandHeight >> 8) & 0xFF);

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

}
