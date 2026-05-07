using System;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services.Providers;

/// <summary>
/// 从 Base64 字符串提供 PDF 数据
/// </summary>
public class Base64PdfProvider : IPdfProvider
{
    private readonly string _base64;

    public Base64PdfProvider(string base64)
    {
        if (string.IsNullOrWhiteSpace(base64))
            throw new ArgumentException("Base64 字符串不能为空", nameof(base64));
        _base64 = base64;
    }

    public byte[] GetPdfBytes()
    {
        try
        {
            return Convert.FromBase64String(_base64);
        }
        catch (FormatException ex)
        {
            throw new ArgumentException("无效的 Base64 格式", ex);
        }
    }
}
