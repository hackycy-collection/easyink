using System;
using EasyInk.Engine.Services.Providers;
using Xunit;

namespace EasyInk.Engine.Tests;

public class Base64PdfProviderTests
{
    [Fact]
    public void GetPdfBytes_ValidBase64_ReturnsBytes()
    {
        var expected = new byte[] { 1, 2, 3, 4 };
        var base64 = Convert.ToBase64String(expected);
        var provider = new Base64PdfProvider(base64);

        Assert.Equal(expected, provider.GetPdfBytes());
    }

    [Fact]
    public void Constructor_EmptyString_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Base64PdfProvider(""));
    }

    [Fact]
    public void Constructor_Null_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Base64PdfProvider(null!));
    }

    [Fact]
    public void GetPdfBytes_InvalidBase64_ThrowsArgumentException()
    {
        var provider = new Base64PdfProvider("not-valid-base64!!!");
        Assert.Throws<ArgumentException>(() => provider.GetPdfBytes());
    }
}

public class BlobPdfProviderTests
{
    [Fact]
    public void GetPdfBytes_ReturnsSameBytes()
    {
        var expected = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
        var provider = new BlobPdfProvider(expected);

        Assert.Equal(expected, provider.GetPdfBytes());
    }

    [Fact]
    public void Constructor_Null_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new BlobPdfProvider(null!));
    }

    [Fact]
    public void Constructor_EmptyArray_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new BlobPdfProvider(Array.Empty<byte>()));
    }
}

public class UrlPdfProviderTests
{
    [Fact]
    public void Constructor_EmptyUrl_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider(""));
    }

    [Fact]
    public void Constructor_InvalidUrl_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("not a url"));
    }

    [Fact]
    public void Constructor_Localhost_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://localhost/test.pdf"));
    }

    [Fact]
    public void Constructor_PrivateIp10_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://10.0.0.1/test.pdf"));
    }

    [Fact]
    public void Constructor_PrivateIp172_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://172.16.0.1/test.pdf"));
    }

    [Fact]
    public void Constructor_PrivateIp192_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://192.168.1.1/test.pdf"));
    }

    [Fact]
    public void Constructor_Loopback127_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://127.0.0.1/test.pdf"));
    }

    [Fact]
    public void Constructor_LinkLocal_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("http://169.254.1.1/test.pdf"));
    }

    [Fact]
    public void Constructor_FtpProtocol_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new UrlPdfProvider("ftp://example.com/test.pdf"));
    }
}
