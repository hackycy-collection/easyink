namespace EasyInk.Printer.Services.Abstractions;

/// <summary>
/// PDF 数据提供者抽象
/// </summary>
public interface IPdfProvider
{
    /// <summary>
    /// 获取 PDF 二进制数据
    /// </summary>
    byte[] GetPdfBytes();
}
