using System;
using System.Runtime.InteropServices;

namespace EasyInk.Engine.Services;

internal static class NativePrintApi
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] ref DOC_INFO_1 pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBuf, int cbBuf, out int pcWritten);

    public static void SendRaw(string printerName, byte[] data, string jobName)
    {
        var di = new DOC_INFO_1
        {
            pDocName = jobName,
            pOutputFile = null,
            pDataType = "RAW"
        };

        if (!OpenPrinter(printerName, out var hPrinter, IntPtr.Zero))
            throw new InvalidOperationException($"无法打开打印机: {printerName}");

        try
        {
            if (!StartDocPrinter(hPrinter, 1, ref di))
                throw new InvalidOperationException("StartDocPrinter 失败");

            if (!StartPagePrinter(hPrinter))
                throw new InvalidOperationException("StartPagePrinter 失败");

            if (!WritePrinter(hPrinter, data, data.Length, out _))
                throw new InvalidOperationException("WritePrinter 失败");

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
        }
        catch
        {
            EndDocPrinter(hPrinter);
            throw;
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }
}
