using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

namespace EasyInk.Engine.Services;

internal static class BitmapToEscPos
{
    private const byte GS = 0x1D;
    private const byte ESC = 0x1B;
    private const int BAND_HEIGHT = 256;

    /// <summary>
    /// 将灰度位图转为 ESC/POS GS v 0 位图指令序列。
    /// 位图先做阈值二值化，再按列打包为 ESC/POS 格式，按 256 点高度分 band。
    /// </summary>
    public static byte[] Convert(Bitmap grayBitmap)
    {
        int w = grayBitmap.Width;
        int h = grayBitmap.Height;
        var bands = new List<byte[]>();

        for (int y = 0; y < h; y += BAND_HEIGHT)
        {
            int bandH = Math.Min(BAND_HEIGHT, h - y);
            bands.Add(BuildBand(grayBitmap, y, bandH));
        }

        return Concat(bands);
    }

    /// <summary>
    /// 初始化 + 部分切纸
    /// </summary>
    public static byte[] InitAndCut()
    {
        return new byte[] { ESC, 0x40, GS, 0x56, 0x42, 0x00 };
    }

    private static byte[] BuildBand(Bitmap src, int startY, int bandHeight)
    {
        int w = src.Width;
        int bytesPerCol = (bandHeight + 7) / 8;

        // GS v 0 header: 1D 76 30 m xL xH yL yH
        var result = new byte[8 + w * bytesPerCol];
        result[0] = GS;
        result[1] = 0x76;
        result[2] = 0x30;
        result[3] = 0;                          // m=0 normal
        result[4] = (byte)(w & 0xFF);            // xL
        result[5] = (byte)((w >> 8) & 0xFF);     // xH
        result[6] = (byte)(bandHeight & 0xFF);   // yL
        result[7] = (byte)((bandHeight >> 8) & 0xFF); // yH

        // 逐列读取，每列 bytesPerCol 个字节，每字节 8 个纵向点 (bit 0 = 顶部)
        for (int col = 0; col < w; col++)
        {
            int colBase = 8 + col * bytesPerCol;
            for (int byteIdx = 0; byteIdx < bytesPerCol; byteIdx++)
            {
                byte val = 0;
                for (int bit = 0; bit < 8; bit++)
                {
                    int py = startY + byteIdx * 8 + bit;
                    if (py >= src.Height) break;
                    var pixel = src.GetPixel(col, py);
                    // 阈值 128: 亮 → 0 (白), 暗 → 1 (黑)
                    if (pixel.R < 128)
                        val |= (byte)(1 << bit);
                }
                result[colBase + byteIdx] = val;
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
