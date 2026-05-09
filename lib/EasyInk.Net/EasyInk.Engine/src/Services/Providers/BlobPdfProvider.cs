using System;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services.Providers;

/// <summary>
/// 从二进制数据提供 PDF
/// </summary>
public class BlobPdfProvider : IPdfProvider
{
    private readonly byte[] _bytes;

    /// <summary>
    /// 初始化二进制 PDF 提供者
    /// </summary>
    /// <param name="bytes">PDF 二进制数据</param>
    public BlobPdfProvider(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0)
            throw new ArgumentException("PDF 二进制数据不能为空", nameof(bytes));
        _bytes = bytes;
    }

    /// <summary>
    /// 获取 PDF 二进制数据
    /// </summary>
    public byte[] GetPdfBytes()
    {
        return _bytes;
    }
}
