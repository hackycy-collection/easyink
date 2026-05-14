using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using EasyInk.Printer;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EasyInk.Printer.Server;

public class MultipartData
{
    public JObject? Params { get; set; }
    public byte[]? PdfBytes { get; set; }
}

public static class MultipartParser
{
    private const long MaxPdfBytes = 50L * 1024 * 1024; // 50MB

    public static MultipartData Parse(byte[] body, string contentType)
    {
        var boundary = ExtractBoundary(contentType);
        if (string.IsNullOrEmpty(boundary))
            throw new ArgumentException(LangManager.Get("Parser_InvalidBoundary"));

        var parts = SplitParts(body, boundary!);
        var result = new MultipartData();

        foreach (var part in parts)
        {
            var headers = ParseHeaders(part.Headers);
            string name;
            string filename;
            headers.TryGetValue("name", out name);
            headers.TryGetValue("filename", out filename);

            if (name == "params" && filename == null)
            {
                var json = Encoding.UTF8.GetString(part.Body);
                result.Params = JObject.Parse(json);
            }
            else if (name == "pdf" || (!string.IsNullOrEmpty(filename) && name == null))
            {
                if (part.Body.Length > MaxPdfBytes)
                    throw new ArgumentException(LangManager.Get("Parser_PdfTooLarge", part.Body.Length / 1024 / 1024, MaxPdfBytes / 1024 / 1024));
                result.PdfBytes = part.Body;
            }
        }

        return result;
    }

    private static string? ExtractBoundary(string contentType)
    {
        if (string.IsNullOrEmpty(contentType))
            return null;

        var parts = contentType.Split(';');
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("boundary=", StringComparison.OrdinalIgnoreCase))
            {
                var boundary = trimmed.Substring(9).Trim('"');
                return boundary;
            }
        }
        return null;
    }

    private static List<MultipartPart> SplitParts(byte[] body, string boundary)
    {
        var parts = new List<MultipartPart>();
        var boundaryBytes = Encoding.UTF8.GetBytes("--" + boundary);
        var endBoundaryBytes = Encoding.UTF8.GetBytes("--" + boundary + "--");

        int pos = FindBytes(body, boundaryBytes, 0);
        if (pos < 0)
            return parts;

        pos += boundaryBytes.Length;

        while (pos < body.Length)
        {
            // 跳过 CRLF
            if (pos + 1 < body.Length && body[pos] == '\r' && body[pos + 1] == '\n')
                pos += 2;

            // 查找下一个 boundary
            int nextBoundary = FindBytes(body, boundaryBytes, pos);
            if (nextBoundary < 0)
                break;

            // 提取 part 内容（去掉尾部 CRLF）
            var partEnd = nextBoundary - 2; // 去掉 \r\n
            if (partEnd > pos)
            {
                var partData = new byte[partEnd - pos];
                Array.Copy(body, pos, partData, 0, partData.Length);
                var part = ParsePart(partData);
                if (part != null)
                    parts.Add(part);
            }

            pos = nextBoundary + boundaryBytes.Length;

            // 检查是否是结束 boundary
            if (pos + 2 <= body.Length && body[pos - 2] == '-' && body[pos - 1] == '-')
                break;

            // 跳过 CRLF
            if (pos + 1 < body.Length && body[pos] == '\r' && body[pos + 1] == '\n')
                pos += 2;
        }

        return parts;
    }

    private static MultipartPart? ParsePart(byte[] partData)
    {
        // 查找 headers 和 body 的分隔（空行）
        var headerEnd = FindBytes(partData, Encoding.UTF8.GetBytes("\r\n\r\n"), 0);
        if (headerEnd < 0)
            return null;

        var headerBytes = new byte[headerEnd];
        Array.Copy(partData, 0, headerBytes, 0, headerEnd);
        var headers = Encoding.UTF8.GetString(headerBytes);

        var bodyStart = headerEnd + 4;
        var body = new byte[partData.Length - bodyStart];
        Array.Copy(partData, bodyStart, body, 0, body.Length);

        return new MultipartPart { Headers = headers, Body = body };
    }

    private static Dictionary<string, string> ParseHeaders(string headers)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var lines = headers.Split(new[] { "\r\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            if (line.StartsWith("Content-Disposition:", StringComparison.OrdinalIgnoreCase))
            {
                var parts = line.Split(';');
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (trimmed.StartsWith("name=", StringComparison.OrdinalIgnoreCase))
                        result["name"] = trimmed.Substring(6).Trim('"');
                    else if (trimmed.StartsWith("filename=", StringComparison.OrdinalIgnoreCase))
                        result["filename"] = trimmed.Substring(9).Trim('"');
                }
            }
        }

        return result;
    }

    private static int FindBytes(byte[] haystack, byte[] needle, int start)
    {
        for (int i = start; i <= haystack.Length - needle.Length; i++)
        {
            bool found = true;
            for (int j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] != needle[j])
                {
                    found = false;
                    break;
                }
            }
            if (found)
                return i;
        }
        return -1;
    }

    private class MultipartPart
    {
        public string Headers { get; set; } = default!;
        public byte[] Body { get; set; } = default!;
    }
}
