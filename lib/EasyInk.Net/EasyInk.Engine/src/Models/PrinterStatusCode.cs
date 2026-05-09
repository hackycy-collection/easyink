namespace EasyInk.Engine.Models;

/// <summary>
/// 打印机状态码常量
/// </summary>
public static class PrinterStatusCode
{
    public const string Ready = "READY";
    public const string PrinterOffline = "PRINTER_OFFLINE";
    public const string PaperJam = "PAPER_JAM";
    public const string PaperOut = "PAPER_OUT";
    public const string PrinterStopped = "PRINTER_STOPPED";
    public const string PrinterError = "PRINTER_ERROR";
    public const string PrinterNotFound = "PRINTER_NOT_FOUND";
}
