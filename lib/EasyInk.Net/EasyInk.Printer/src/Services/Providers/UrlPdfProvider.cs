using System;
using System.IO;
using System.Net;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services.Providers;

/// <summary>
/// 从 URL 下载 PDF 数据
/// </summary>
public class UrlPdfProvider : IPdfProvider
{
    private const long MaxPdfBytes = 50L * 1024 * 1024; // 50MB
    private const int TimeoutMs = 30_000;

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
            var request = WebRequest.Create(_url);
            request.Timeout = TimeoutMs;

            using (var response = request.GetResponse())
            using (var stream = response.GetResponseStream())
            using (var ms = new MemoryStream())
            {
                var buffer = new byte[81920];
                int read;
                long total = 0;
                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                {
                    total += read;
                    if (total > MaxPdfBytes)
                        throw new ArgumentException($"下载的 PDF 文件过大，上限 {MaxPdfBytes / 1024 / 1024}MB");
                    ms.Write(buffer, 0, read);
                }
                return ms.ToArray();
            }
        }
        catch (ArgumentException) { throw; }
        catch (WebException ex)
        {
            throw new ArgumentException($"下载 PDF 失败: {ex.Message}", ex);
        }
    }
}
