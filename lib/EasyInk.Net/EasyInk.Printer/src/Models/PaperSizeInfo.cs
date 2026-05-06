namespace EasyInk.Printer.Models;

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
