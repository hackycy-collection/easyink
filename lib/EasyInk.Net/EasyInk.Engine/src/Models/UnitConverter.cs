using System;

namespace EasyInk.Engine.Models;

internal static class UnitConverter
{
    /// <summary>
    /// 将指定单位的值转换为百分之一英寸
    /// </summary>
    internal static int ToHundredthsOfInch(double value, string unit)
    {
        switch (unit?.ToLowerInvariant())
        {
            case "mm": return (int)Math.Round(value / 25.4 * 100);
            case "inch": return (int)Math.Round(value * 100);
            default: throw new ArgumentException($"不支持的单位: {unit}，仅支持 mm 或 inch");
        }
    }
}
