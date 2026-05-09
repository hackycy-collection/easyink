using System;

namespace EasyInk.Engine.Models;

/// <summary>
/// 偏移参数
/// </summary>
public class OffsetParams
{
    /// <summary>
    /// X偏移
    /// </summary>
    public double X { get; set; }

    /// <summary>
    /// Y偏移
    /// </summary>
    public double Y { get; set; }

    /// <summary>
    /// 单位（mm 或 inch）
    /// </summary>
    public string Unit { get; set; } = "mm";

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int XInHundredthsOfInch => ConvertToHundredthsOfInch(X);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int YInHundredthsOfInch => ConvertToHundredthsOfInch(Y);

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
