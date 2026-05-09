using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services.Providers;

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
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new ArgumentException("无效的 URL 格式", nameof(url));
        if (uri.Scheme != "http" && uri.Scheme != "https")
            throw new ArgumentException("仅支持 http/https 协议", nameof(url));
        ValidateHostNotPrivate(uri.Host);
        _url = url;
    }

    private static void ValidateHostNotPrivate(string host)
    {
        if (IPAddress.TryParse(host, out var ip))
        {
            if (IsPrivateIp(ip))
                throw new ArgumentException("不允许访问内网地址", nameof(host));
            return;
        }

        if (host == "localhost")
            throw new ArgumentException("不允许访问 localhost", nameof(host));
    }

    private static bool IsPrivateIp(IPAddress ip)
    {
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = ip.GetAddressBytes();
            // 10.0.0.0/8
            if (bytes[0] == 10) return true;
            // 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
            // 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168) return true;
            // 127.0.0.0/8
            if (bytes[0] == 127) return true;
            // 169.254.0.0/16 (link-local)
            if (bytes[0] == 169 && bytes[1] == 254) return true;
            // 0.0.0.0
            if (ip.Equals(IPAddress.Any)) return true;
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (IPAddress.IsLoopback(ip)) return true;
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal) return true;
            if (ip.Equals(IPAddress.IPv6Any)) return true;
        }

        return false;
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
