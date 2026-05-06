namespace EasyInk.Printer.Models;

/// <summary>
/// 打印请求参数
/// </summary>
public class PrintRequestParams
{
    /// <summary>
    /// 打印机名称
    /// </summary>
    public string PrinterName { get; set; }

    /// <summary>
    /// PDF文件的Base64编码
    /// </summary>
    public string PdfBase64 { get; set; }

    /// <summary>
    /// 打印份数
    /// </summary>
    public int Copies { get; set; } = 1;

    /// <summary>
    /// 纸张尺寸
    /// </summary>
    public PaperSizeParams PaperSize { get; set; }

    /// <summary>
    /// DPI（每英寸点数）
    /// </summary>
    public int Dpi { get; set; } = 300;

    /// <summary>
    /// 打印偏移
    /// </summary>
    public OffsetParams Offset { get; set; }

    /// <summary>
    /// 用户数据（用于审计日志）
    /// </summary>
    public UserDataParams UserData { get; set; }
}

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

/// <summary>
/// 用户数据参数
/// </summary>
public class UserDataParams
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; }

    /// <summary>
    /// 标签类型
    /// </summary>
    public string LabelType { get; set; }
}

/// <summary>
/// 打印结果
/// </summary>
public class PrintResult
{
    /// <summary>
    /// 打印任务ID
    /// </summary>
    public string JobId { get; set; }

    /// <summary>
    /// 打印状态
    /// </summary>
    public string Status { get; set; } = "completed";

    /// <summary>
    /// 创建成功结果
    /// </summary>
    public static PrintResult Success(string jobId)
    {
        return new PrintResult
        {
            JobId = jobId,
            Status = "completed"
        };
    }
}
