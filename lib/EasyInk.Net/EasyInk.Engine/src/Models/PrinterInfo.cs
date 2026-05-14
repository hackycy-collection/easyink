using System.Collections.Generic;

namespace EasyInk.Engine.Models;

/// <summary>
/// 打印机信息
/// </summary>
public class PrinterInfo
{
    /// <summary>
    /// 打印机名称
    /// </summary>
    public string Name { get; set; } = default!;

    /// <summary>
    /// 是否为默认打印机
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// 打印机状态
    /// </summary>
    public PrinterStatus Status { get; set; } = default!;

    /// <summary>
    /// 支持的纸张尺寸列表
    /// </summary>
    public List<PaperSizeInfo> SupportedPaperSizes { get; set; } = new List<PaperSizeInfo>();
}
