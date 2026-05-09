namespace EasyInk.Engine.Models;

/// <summary>
/// 打印机状态码常量
/// </summary>
public static class PrinterStatusCode
{
    /// <summary>就绪</summary>
    public const string Ready = "READY";
    /// <summary>离线</summary>
    public const string PrinterOffline = "PRINTER_OFFLINE";
    /// <summary>卡纸</summary>
    public const string PaperJam = "PAPER_JAM";
    /// <summary>缺纸</summary>
    public const string PaperOut = "PAPER_OUT";
    /// <summary>已停止</summary>
    public const string PrinterStopped = "PRINTER_STOPPED";
    /// <summary>错误</summary>
    public const string PrinterError = "PRINTER_ERROR";
    /// <summary>打印机不存在</summary>
    public const string PrinterNotFound = "PRINTER_NOT_FOUND";
    /// <summary>WMI 状态不可用</summary>
    public const string WmiUnavailable = "WMI_UNAVAILABLE";
}
