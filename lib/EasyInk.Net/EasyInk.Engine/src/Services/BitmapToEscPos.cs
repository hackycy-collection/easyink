using System;
using System.Drawing;
using System.Drawing.Imaging;

namespace EasyInk.Engine.Services;

internal static class BitmapToEscPos
{
    private const byte ESC = 0x1B;
    private const byte GS = 0x1D;
    private const int BAND_HEIGHT = 256;

    /// <summary>
    /// 灰度位图 → ESC/POS GS v 0 位图指令。行主序，MSB=最左。
    /// </summary>
    public static byte[] Convert(Bitmap grayBitmap)
    {
        int w = grayBitmap.Width;
        int h = grayBitmap.Height;
        int bytesPerRow = (w + 7) / 8;
        int totalDataBytes = bytesPerRow * h;
        var result = new byte[8 + totalDataBytes];

        // GS v 0 一次性发送完整图像，避免 band 间隙
        // xL+xH*256 = bytes per row; yL+yH*256 = dots height
        result[0] = GS;
        result[1] = 0x76;
        result[2] = 0x30;
        result[3] = 0;
        result[4] = (byte)(bytesPerRow & 0xFF);
        result[5] = (byte)((bytesPerRow >> 8) & 0xFF);
        result[6] = (byte)(h & 0xFF);
        result[7] = (byte)((h >> 8) & 0xFF);

        var bmpData = grayBitmap.LockBits(
            new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);

        var rgb = new byte[bmpData.Stride * h];
        System.Runtime.InteropServices.Marshal.Copy(bmpData.Scan0, rgb, 0, rgb.Length);
        grayBitmap.UnlockBits(bmpData);

        for (int row = 0; row < h; row++)
        {
            int rowBase = 8 + row * bytesPerRow;
            for (int byteX = 0; byteX < bytesPerRow; byteX++)
            {
                byte val = 0;
                for (int bit = 0; bit < 8; bit++)
                {
                    int srcX = byteX * 8 + bit;
                    if (srcX >= w) break;
                    int offset = row * bmpData.Stride + srcX * 3;
                    if (rgb[offset] < 128) // R channel
                        val |= (byte)(0x80 >> bit);
                }
                result[rowBase + byteX] = val;
            }
        }

        return result;
    }

    /// <summary>
    /// ESC @ 初始化 + 行距清零 + 位图打印后切纸
    /// </summary>
    public static byte[] CmdInit() => new byte[] { ESC, 0x40, ESC, 0x33, 0x00 }; // ESC @  ESC 3 0

    public static byte[] CmdCut() => new byte[] { GS, 0x56, 0x42, 0x00 }; // GS V B 0
}
