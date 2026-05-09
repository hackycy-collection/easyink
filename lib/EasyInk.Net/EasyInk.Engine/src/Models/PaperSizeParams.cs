namespace EasyInk.Engine.Models;

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
    public int WidthInHundredthsOfInch => UnitConverter.ToHundredthsOfInch(Width, Unit);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int HeightInHundredthsOfInch => UnitConverter.ToHundredthsOfInch(Height, Unit);
}
