using System;
using System.Net;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services.Providers;

/// <summary>
/// 从 URL 下载 PDF 数据
/// </summary>
public class UrlPdfProvider : IPdfProvider
{
    private readonly string _url;

    public UrlPdfProvider(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("URL 不能为空", nameof(url));
        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
            throw new ArgumentException("无效的 URL 格式", nameof(url));
        _url = url;
    }

    public byte[] GetPdfBytes()
    {
        try
        {
            using (var client = new WebClient())
            {
                return client.DownloadData(_url);
            }
        }
        catch (WebException ex)
        {
            throw new ArgumentException($"下载 PDF 失败: {ex.Message}", ex);
        }
    }
}
