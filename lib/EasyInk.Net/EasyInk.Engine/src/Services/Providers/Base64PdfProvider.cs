using System;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services.Providers;

/// <summary>
/// 从 Base64 字符串提供 PDF 数据
/// </summary>
public class Base64PdfProvider : IPdfProvider
{
    private readonly string _base64;

    /// <summary>
    /// 初始化 Base64 PDF 提供者
    /// </summary>
    /// <param name="base64">Base64 编码的 PDF 数据</param>
    public Base64PdfProvider(string base64)
    {
        if (string.IsNullOrWhiteSpace(base64))
            throw new ArgumentException("Base64 字符串不能为空", nameof(base64));
        _base64 = base64;
    }

    /// <summary>
    /// 获取 PDF 二进制数据
    /// </summary>
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
