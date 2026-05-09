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
    public int XInHundredthsOfInch => UnitConverter.ToHundredthsOfInch(X, Unit);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int YInHundredthsOfInch => UnitConverter.ToHundredthsOfInch(Y, Unit);
}
