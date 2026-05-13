using System;
using System.Runtime.InteropServices;

namespace EasyInk.Engine.Services;

internal static class NativePrintApi
{
    public const int DM_OUT_BUFFER = 2;
    public const int DM_IN_BUFFER = 8;
    public const int DM_PAPERSIZE = 0x0002;
    public const int DM_PAPERWIDTH = 0x0008;
    public const int DM_PAPERLENGTH = 0x0004;
    public const short DMPAPER_USER = 256;
    public const int IDOK = 1;
    public const int PRINTER_ACCESS_USE = 0x00000008;
    public const uint GMEM_MOVEABLE = 0x0002;

    // DEVMODE structure field offsets (printer-specific union members)
    public const int DEV_MODE_FIELDS_OFFSET = 72;
    public const int DEV_MODE_PAPER_SIZE_OFFSET = 78;
    public const int DEV_MODE_PAPER_LENGTH_OFFSET = 80;
    public const int DEV_MODE_PAPER_WIDTH_OFFSET = 82;

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, ref PRINTER_DEFAULTS pDefault);

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern int DocumentProperties(
        IntPtr hWnd,
        IntPtr hPrinter,
        string pDeviceName,
        IntPtr pDevModeOutput,
        IntPtr pDevModeInput,
        int fMode);

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool SetPrinter(IntPtr hPrinter, uint Level, IntPtr pPrinter, uint Command);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GlobalUnlock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalFree(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);

    [StructLayout(LayoutKind.Sequential)]
    public struct PRINTER_DEFAULTS
    {
        public IntPtr pDatatype;
        public IntPtr pDevMode;
        public int DesiredAccess;
    }
}
