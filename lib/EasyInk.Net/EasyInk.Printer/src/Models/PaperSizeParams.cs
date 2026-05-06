namespace EasyInk.Printer.Models;

/// <summary>
/// 纸张尺寸参数
/// </summary>
public class PaperSizeParams
{
    /// <summary>
    /// 宽度
    /// </summary>
    public double Width { get; set; }

    /// <summary>
    /// 高度
    /// </summary>
    public double Height { get; set; }

    /// <summary>
    /// 单位（mm 或 inch）
    /// </summary>
    public string Unit { get; set; } = "mm";

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int WidthInHundredthsOfInch => Unit == "mm"
        ? (int)(Width / 25.4 * 100)
        : (int)(Width * 100);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int HeightInHundredthsOfInch => Unit == "mm"
        ? (int)(Height / 25.4 * 100)
        : (int)(Height * 100);
}
