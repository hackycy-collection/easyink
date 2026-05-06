namespace EasyInk.Printer.Models;

/// <summary>
/// 打印机信息
/// </summary>
public class PrinterInfo
{
    /// <summary>
    /// 打印机名称
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// 是否为默认打印机
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// 打印机状态
    /// </summary>
    public PrinterStatus Status { get; set; }

    /// <summary>
    /// 支持的纸张尺寸列表
    /// </summary>
    public List<PaperSizeInfo> SupportedPaperSizes { get; set; } = new List<PaperSizeInfo>();
}

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

/// <summary>
/// 纸张尺寸信息
/// </summary>
public class PaperSizeInfo
{
    /// <summary>
    /// 纸张名称
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// 宽度（百分之一英寸）
    /// </summary>
    public int Width { get; set; }

    /// <summary>
    /// 高度（百分之一英寸）
    /// </summary>
    public int Height { get; set; }
}
