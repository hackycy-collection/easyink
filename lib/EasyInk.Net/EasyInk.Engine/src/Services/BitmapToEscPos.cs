using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

namespace EasyInk.Engine.Services;

/// <summary>
/// 灰度位图 → ESC/POS 位图指令。使用 ESC * m=33 (24-dot double-density) column-major 格式，
/// 兼容 Epson 及国产热敏打印机。
/// </summary>
internal static class BitmapToEscPos
{
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;
    private const int STRIP_HEIGHT = 24; // ESC * m=33: 24 dots per column

    public static byte[] CmdInit() => new byte[] { ESC, 0x40, ESC, 0x33, 0x18 }; // ESC @  ESC 3 24
    public static byte[] CmdCut() => new byte[] { GS, 0x56, 0x01 };               // GS V 1

    /// <summary>
    /// ESC * m=33: 24-dot double-density, column-major.
    /// 每个 strip 24 点高，每列 3 字节 (top/mid/bot 各 8 点)，bit7=最上。
    /// </summary>
    public static List<byte[]> ConvertToStrips(Bitmap grayBitmap)
    {
        int w = grayBitmap.Width;
        int h = grayBitmap.Height;
        var strips = new List<byte[]>();

        for (int startY = 0; startY < h; startY += STRIP_HEIGHT)
        {
            int stripH = Math.Min(STRIP_HEIGHT, h - startY);
            strips.Add(BuildStrip(grayBitmap, w, startY, stripH));
        }

        return strips;
    }

    private static byte[] BuildStrip(Bitmap src, int w, int startY, int stripHeight)
    {
        // ESC * m nL nH d1...dk \n
        // m=33 (24-dot double-density), nL+nH*256 = width in columns
        int dataLen = w * 3; // 3 bytes per column for 24-dot mode
        var result = new byte[4 + dataLen + 1]; // ESC * m nL nH + data + \n
        result[0] = ESC;
        result[1] = 0x2A; // '*'
        result[2] = 33;   // m = 24-dot double-density
        result[3] = (byte)(w & 0xFF);     // nL
        result[4] = (byte)((w >> 8) & 0xFF); // nH

        var bmpData = src.LockBits(
            new Rectangle(0, startY, w, stripHeight),
            ImageLockMode.ReadOnly,
            PixelFormat.Format24bppRgb);
        int stride = bmpData.Stride;
        var rgb = new byte[stride * stripHeight];
        System.Runtime.InteropServices.Marshal.Copy(bmpData.Scan0, rgb, 0, rgb.Length);
        src.UnlockBits(bmpData);

        for (int col = 0; col < w; col++)
        {
            int baseOff = 5 + col * 3;
            // 3 bytes per column: top(0-7), mid(8-15), bot(16-23)
            // bit7 = topmost within each byte group
            for (int seg = 0; seg < 3; seg++)
            {
                byte val = 0;
                for (int bit = 0; bit < 8; bit++)
                {
                    int py = seg * 8 + bit;
                    if (py >= stripHeight) break;
                    int offset = py * stride + col * 3;
                    if (rgb[offset] < 128)
                        val |= (byte)(0x80 >> bit); // 0x80=最上
                }
                result[baseOff + seg] = val;
            }
        }
        // 末尾 \n (line feed)
        result[4 + dataLen] = 0x0A;

        return result;
    }
}
