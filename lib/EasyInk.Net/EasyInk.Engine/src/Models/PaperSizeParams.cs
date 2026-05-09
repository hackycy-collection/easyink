using System;

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
    public int WidthInHundredthsOfInch => ConvertToHundredthsOfInch(Width);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int HeightInHundredthsOfInch => ConvertToHundredthsOfInch(Height);

    private int ConvertToHundredthsOfInch(double value)
    {
        switch (Unit?.ToLowerInvariant())
        {
            case "mm": return (int)Math.Round(value / 25.4 * 100);
            case "inch": return (int)Math.Round(value * 100);
            default: throw new ArgumentException($"不支持的单位: {Unit}，仅支持 mm 或 inch");
        }
    }
}
