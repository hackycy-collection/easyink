using System;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services.Providers;

/// <summary>
/// 从二进制数据提供 PDF
/// </summary>
public class BlobPdfProvider : IPdfProvider
{
    private readonly byte[] _bytes;

    public BlobPdfProvider(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0)
            throw new ArgumentException("PDF 二进制数据不能为空", nameof(bytes));
        _bytes = bytes;
    }

    public byte[] GetPdfBytes()
    {
        return _bytes;
    }
}
