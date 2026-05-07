using System;
using System.IO;
using System.Text;
using EasyInk.Printer.Host.Server;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Printer.Host.Tests;

public class MultipartParserTests
{
    private static string BuildMultipartBody(string boundary, string paramsJson, byte[] pdfBytes, string pdfFieldName = "pdf")
    {
        using (var ms = new MemoryStream())
        using (var writer = new StreamWriter(ms, Encoding.UTF8, 1024, true))
        {
            // params part
            writer.Write($"--{boundary}\r\n");
            writer.Write($"Content-Disposition: form-data; name=\"params\"\r\n");
            writer.Write("\r\n");
            writer.Write(paramsJson);
            writer.Write("\r\n");

            // pdf part
            writer.Write($"--{boundary}\r\n");
            writer.Write($"Content-Disposition: form-data; name=\"{pdfFieldName}\"; filename=\"test.pdf\"\r\n");
            writer.Write("Content-Type: application/pdf\r\n");
            writer.Write("\r\n");
            writer.Flush();

            ms.Write(pdfBytes, 0, pdfBytes.Length);
            writer.Write("\r\n");

            // end boundary
            writer.Write($"--{boundary}--\r\n");
            writer.Flush();

            return Encoding.UTF8.GetString(ms.ToArray());
        }
    }

    private static byte[] BuildMultipartBytes(string boundary, string paramsJson, byte[] pdfBytes)
    {
        var header = $"--{boundary}\r\n" +
                     $"Content-Disposition: form-data; name=\"params\"\r\n\r\n" +
                     $"{paramsJson}\r\n" +
                     $"--{boundary}\r\n" +
                     $"Content-Disposition: form-data; name=\"pdf\"; filename=\"test.pdf\"\r\n" +
                     $"Content-Type: application/pdf\r\n\r\n";

        var headerBytes = Encoding.UTF8.GetBytes(header);
        var footerBytes = Encoding.UTF8.GetBytes($"\r\n--{boundary}--\r\n");

        var result = new byte[headerBytes.Length + pdfBytes.Length + footerBytes.Length];
        Buffer.BlockCopy(headerBytes, 0, result, 0, headerBytes.Length);
        Buffer.BlockCopy(pdfBytes, 0, result, headerBytes.Length, pdfBytes.Length);
        Buffer.BlockCopy(footerBytes, 0, result, headerBytes.Length + pdfBytes.Length, footerBytes.Length);

        return result;
    }

    [Fact]
    public void Parse_ValidMultipart_ExtractsParamsAndPdf()
    {
        var boundary = "----TestBoundary123";
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
        var paramsJson = "{\"printerName\":\"TestPrinter\",\"copies\":1}";
        var body = BuildMultipartBytes(boundary, paramsJson, pdfBytes);
        var contentType = $"multipart/form-data; boundary={boundary}";

        var result = MultipartParser.Parse(body, contentType);

        Assert.NotNull(result.Params);
        Assert.Equal("TestPrinter", result.Params["printerName"].ToString());
        Assert.NotNull(result.PdfBytes);
        Assert.Equal(pdfBytes, result.PdfBytes);
    }

    [Fact]
    public void Parse_MissingBoundary_ThrowsArgumentException()
    {
        var body = Encoding.UTF8.GetBytes("some body");
        Assert.Throws<ArgumentException>(() => MultipartParser.Parse(body, "multipart/form-data"));
    }

    [Fact]
    public void Parse_EmptyBody_ReturnsNullFields()
    {
        var boundary = "----TestBoundary";
        var body = Encoding.UTF8.GetBytes($"--{boundary}--\r\n");
        var contentType = $"multipart/form-data; boundary={boundary}";

        var result = MultipartParser.Parse(body, contentType);

        Assert.Null(result.Params);
        Assert.Null(result.PdfBytes);
    }

    [Fact]
    public void Parse_OnlyParams_NoPdf_PdfBytesIsNull()
    {
        var boundary = "----TestBoundary";
        var paramsJson = "{\"printerName\":\"TestPrinter\"}";

        var header = $"--{boundary}\r\n" +
                     $"Content-Disposition: form-data; name=\"params\"\r\n\r\n" +
                     $"{paramsJson}\r\n" +
                     $"--{boundary}--\r\n";

        var body = Encoding.UTF8.GetBytes(header);
        var contentType = $"multipart/form-data; boundary={boundary}";

        var result = MultipartParser.Parse(body, contentType);

        Assert.NotNull(result.Params);
        Assert.Equal("TestPrinter", result.Params["printerName"].ToString());
        Assert.Null(result.PdfBytes);
    }

    [Fact]
    public void Parse_UnnamedFieldWithFilename_ExtractsPdf()
    {
        var boundary = "----TestBoundary";
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        var paramsJson = "{\"printerName\":\"Test\"}";

        // No name attribute, but has filename — parser treats as PDF
        var header = $"--{boundary}\r\n" +
                     $"Content-Disposition: form-data; name=\"params\"\r\n\r\n" +
                     $"{paramsJson}\r\n" +
                     $"--{boundary}\r\n" +
                     $"Content-Disposition: form-data; filename=\"test.pdf\"\r\n\r\n";

        var headerBytes = Encoding.UTF8.GetBytes(header);
        var footerBytes = Encoding.UTF8.GetBytes($"\r\n--{boundary}--\r\n");

        var body = new byte[headerBytes.Length + pdfBytes.Length + footerBytes.Length];
        Buffer.BlockCopy(headerBytes, 0, body, 0, headerBytes.Length);
        Buffer.BlockCopy(pdfBytes, 0, body, headerBytes.Length, pdfBytes.Length);
        Buffer.BlockCopy(footerBytes, 0, body, headerBytes.Length + pdfBytes.Length, footerBytes.Length);

        var contentType = $"multipart/form-data; boundary={boundary}";

        var result = MultipartParser.Parse(body, contentType);

        Assert.NotNull(result.PdfBytes);
        Assert.Equal(pdfBytes, result.PdfBytes);
    }
}
