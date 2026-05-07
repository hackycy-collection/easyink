namespace EasyInk.Printer.Models;

/// <summary>
/// 打印机状态
/// </summary>
public class PrinterStatus
{
    /// <summary>
    /// 是否就绪
    /// </summary>
    public bool IsReady { get; set; }

    /// <summary>
    /// 状态码
    /// </summary>
    public string StatusCode { get; set; }

    /// <summary>
    /// 状态消息
    /// </summary>
    public string Message { get; set; }

    /// <summary>
    /// 是否在线
    /// </summary>
    public bool IsOnline { get; set; }

    /// <summary>
    /// 是否有纸
    /// </summary>
    public bool HasPaper { get; set; }

    /// <summary>
    /// 是否卡纸
    /// </summary>
    public bool IsPaperJam { get; set; }

    /// <summary>
    /// 打印机详细状态描述（WMI PrinterState）
    /// </summary>
    public string PrinterState { get; set; }
}
