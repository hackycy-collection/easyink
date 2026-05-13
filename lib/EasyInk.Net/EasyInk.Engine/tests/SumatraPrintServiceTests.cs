using System;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services;
using EasyInk.Engine.Services.Abstractions;
using Moq;
using Xunit;

namespace EasyInk.Engine.Tests;

public class SumatraPrintServiceTests
{
    private readonly Mock<IPrinterService> _printerService = new();

    private SumatraPrintService CreateService(string exePath = null)
    {
        return new SumatraPrintService(
            _printerService.Object,
            exePath ?? @"C:\nonexistent\SumatraPDF.exe");
    }

    private static PrintRequestParams CreateRequest(
        string printerName = "TestPrinter",
        string pdfBase64 = null,
        int copies = 1,
        bool landscape = false)
    {
        return new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = pdfBase64 ?? Convert.ToBase64String(new byte[] { 1, 2, 3 }),
            Copies = copies,
            Landscape = landscape
        };
    }

    private static PrinterStatus ReadyStatus()
    {
        return new PrinterStatus
        {
            IsReady = true,
            StatusCode = PrinterStatusCode.Ready,
            IsOnline = true,
            HasPaper = true
        };
    }

    private static PrinterStatus OfflineStatus()
    {
        return new PrinterStatus
        {
            IsReady = false,
            StatusCode = "PRINTER_OFFLINE",
            Message = "打印机离线",
            IsOnline = false,
            HasPaper = true
        };
    }

    [Fact]
    public void Print_PrinterNotReady_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(OfflineStatus());

        var service = CreateService();
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("PRINTER_OFFLINE", result.ErrorInfo.Code);
    }

    [Fact]
    public void Print_SumatraNotFound_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var service = CreateService(@"C:\nonexistent\SumatraPDF.exe");
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal(ErrorCode.SumatraNotFound, result.ErrorInfo.Code);
    }

    [Fact]
    public void Print_NoPdfSource_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var service = CreateService();
        var request = new PrintRequestParams
        {
            PrinterName = "TestPrinter",
            Copies = 1
        };
        var result = service.Print("req-1", request);


        Assert.False(result.Success);
        Assert.Equal(ErrorCode.InvalidPdfSource, result.ErrorInfo.Code);
    }

    [Fact]
    public void BuildArguments_BasicPrint()
    {
        var request = CreateRequest();
        var args = SumatraPrintService.BuildArguments(@"C:\test.pdf", request);

        Assert.Contains("-print-to \"TestPrinter\"", args);
        Assert.Contains("-exit-on-print", args);
        Assert.Contains("-silent", args);
        Assert.Contains("\"C:\\test.pdf\"", args);
    }

    [Fact]
    public void BuildArguments_WithCopies()
    {
        var request = CreateRequest(copies: 3);
        var args = SumatraPrintService.BuildArguments(@"C:\test.pdf", request);

        Assert.Contains("-print-settings \"shrink,3x\"", args);
    }

    [Fact]
    public void BuildArguments_WithLandscape()
    {
        var request = CreateRequest(landscape: true);
        var args = SumatraPrintService.BuildArguments(@"C:\test.pdf", request);

        Assert.Contains("-print-settings \"shrink,landscape\"", args);
    }

    [Fact]
    public void BuildArguments_CopiesAndLandscape()
    {
        var request = CreateRequest(copies: 2, landscape: true);
        var args = SumatraPrintService.BuildArguments(@"C:\test.pdf", request);

        Assert.Contains("-print-settings \"shrink,2x,landscape\"", args);
    }

    [Fact]
    public void BuildPrintSettings_NoSettings_ReturnsNoscale()
    {
        var request = CreateRequest();
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.Equal("shrink", settings);
    }

    [Fact]
    public void BuildPrintSettings_MultipleCopies()
    {
        var request = CreateRequest(copies: 5);
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.Equal("shrink,5x", settings);
    }

    [Fact]
    public void BuildPrintSettings_SingleCopy_Omitted()
    {
        var request = CreateRequest(copies: 1);
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.DoesNotContain("1x", settings);
    }

    [Fact]
    public void BuildPrintSettings_Landscape()
    {
        var request = CreateRequest(landscape: true);
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.Equal("shrink,landscape", settings);
    }

    [Fact]
    public void BuildPrintSettings_WithPaperSize()
    {
        var request = CreateRequest();
        request.PaperSize = new PaperSizeParams { Width = 100, Height = 150, Unit = "mm" };
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.Contains("paper=100mm x 150mm", settings);
    }

    [Fact]
    public void BuildPrintSettings_AllOptions()
    {
        var request = CreateRequest(copies: 2, landscape: true);
        request.PaperSize = new PaperSizeParams { Width = 50, Height = 30, Unit = "mm" };
        var settings = SumatraPrintService.BuildPrintSettings(request);

        Assert.Contains("2x", settings);
        Assert.Contains("landscape", settings);
        Assert.Contains("paper=50mm x 30mm", settings);
    }

    [Fact]
    public void BuildPrintSettings_WithPaperKind_UsesPaperKind()
    {
        var request = CreateRequest();
        request.PaperSize = new PaperSizeParams { Width = 80, Height = 200, Unit = "mm" };
        var settings = SumatraPrintService.BuildPrintSettings(request, paperKind: 256);

        Assert.Contains("paperkind=256", settings);
        Assert.DoesNotContain("paper=", settings);
    }

    [Fact]
    public void BuildPrintSettings_PaperKindZero_FallsBackToPaper()
    {
        var request = CreateRequest();
        request.PaperSize = new PaperSizeParams { Width = 80, Height = 200, Unit = "mm" };
        var settings = SumatraPrintService.BuildPrintSettings(request, paperKind: 0);

        Assert.Contains("paper=80mm x 200mm", settings);
        Assert.DoesNotContain("paperkind=", settings);
    }

    [Fact]
    public void BuildPrintSettings_PaperKindNull_FallsBackToPaper()
    {
        var request = CreateRequest();
        request.PaperSize = new PaperSizeParams { Width = 80, Height = 200, Unit = "mm" };
        var settings = SumatraPrintService.BuildPrintSettings(request, paperKind: null);

        Assert.Contains("paper=80mm x 200mm", settings);
        Assert.DoesNotContain("paperkind=", settings);
    }
}
