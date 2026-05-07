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

    /// <summary>
    /// 初始化 URL PDF 提供者
    /// </summary>
    /// <param name="url">PDF 文件的 URL 地址</param>
    public UrlPdfProvider(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("URL 不能为空", nameof(url));
        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
            throw new ArgumentException("无效的 URL 格式", nameof(url));
        _url = url;
    }

    /// <summary>
    /// 下载并获取 PDF 二进制数据
    /// </summary>
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
