namespace EasyInk.Printer.Models;

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
    public int XInHundredthsOfInch => Unit == "mm"
        ? (int)(X / 25.4 * 100)
        : (int)(X * 100);

    /// <summary>
    /// 转换为百分之一英寸
    /// </summary>
    public int YInHundredthsOfInch => Unit == "mm"
        ? (int)(Y / 25.4 * 100)
        : (int)(Y * 100);
}
