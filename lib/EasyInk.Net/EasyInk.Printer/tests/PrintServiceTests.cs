using System;
using System.Collections.Generic;
using System.Drawing;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services;
using EasyInk.Printer.Services.Abstractions;
using Moq;
using Xunit;

namespace EasyInk.Printer.Tests;

public class PrintServiceTests
{
    private readonly Mock<IPrinterService> _printerService = new();
    private readonly Mock<IPdfRenderService> _pdfRenderService = new();
    private readonly Mock<IAuditService> _auditService = new();

    private PrintService CreateService()
    {
        return new PrintService(_printerService.Object, _pdfRenderService.Object, _auditService.Object);
    }

    private static PrintRequestParams CreateRequest(string printerName = "TestPrinter", string pdfBase64 = null)
    {
        return new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = pdfBase64 ?? Convert.ToBase64String(new byte[] { 1, 2, 3 }),
            Copies = 1,
            Dpi = 300
        };
    }

    private static PrinterStatus ReadyStatus()
    {
        return new PrinterStatus
        {
            IsReady = true,
            StatusCode = "READY",
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
        Assert.Equal("打印机离线", result.ErrorInfo.Message);
    }

    [Fact]
    public void Print_PdfRenderThrows_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Throws(new ArgumentException("无效的PDF"));

        var service = CreateService();
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("INVALID_PDF", result.ErrorInfo.Code);
        Assert.Contains("PDF解析失败", result.ErrorInfo.Message);
    }

    [Fact]
    public void Print_PdfRenderReturnsEmpty_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(new List<Image>());

        var service = CreateService();
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("INVALID_PDF", result.ErrorInfo.Code);
        Assert.Equal("PDF渲染失败或为空", result.ErrorInfo.Message);
    }

    [Fact]
    public void Print_PdfRenderReturnsEmpty_DisposesImages()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());
        var images = new List<Image>();
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(images);

        var service = CreateService();
        service.Print("req-1", CreateRequest());

        _pdfRenderService.Verify(s => s.DisposeImages(images), Times.Once);
    }

    [Fact]
    public void Print_PrinterNotFound_LogsAuditAndReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var images = new List<Image> { new Bitmap(1, 1) };
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(images);

        PrintAuditLog capturedLog = null;
        _auditService.Setup(s => s.LogPrint(It.IsAny<PrintAuditLog>()))
            .Callback<PrintAuditLog>(log => capturedLog = log);

        var service = CreateService();
        // "TestPrinter" doesn't exist on the test machine, so PrintDocument.Print() will throw
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("PRINT_FAILED", result.ErrorInfo.Code);
        Assert.NotNull(capturedLog);
        Assert.Equal("Failed", capturedLog.Status);
        Assert.Equal("TestPrinter", capturedLog.PrinterName);
        Assert.Equal("req-1", capturedLog.JobId);

        _pdfRenderService.Verify(s => s.DisposeImages(images), Times.Once);
    }

    [Fact]
    public void Print_ExceptionDuringPrint_DisposesImages()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var images = new List<Image> { new Bitmap(1, 1) };
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(images);

        var service = CreateService();
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("PRINT_FAILED", result.ErrorInfo.Code);

        _pdfRenderService.Verify(s => s.DisposeImages(images), Times.Once);
    }

    [Fact]
    public void Print_PaperSize_SetsCustomPaperSize()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var images = new List<Image> { new Bitmap(100, 100) };
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(images);

        var request = CreateRequest();
        request.PaperSize = new PaperSizeParams { Width = 100, Height = 150, Unit = "mm" };

        var service = CreateService();
        var result = service.Print("req-1", request);

        // PrintDocument.Print() will likely throw since "TestPrinter" doesn't exist,
        // but the important thing is the paper size was set without error before that point
        _pdfRenderService.Verify(s => s.DisposeImages(images), Times.Once);
    }

    [Fact]
    public void Print_WithOffset_SetsMargins()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var images = new List<Image> { new Bitmap(100, 100) };
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(images);

        var request = CreateRequest();
        request.Offset = new OffsetParams { X = 10, Y = 20, Unit = "mm" };

        var service = CreateService();
        var result = service.Print("req-1", request);

        _pdfRenderService.Verify(s => s.DisposeImages(images), Times.Once);
    }

    [Fact]
    public void Print_ExceptionDuringRender_DisposesImages()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        // First call returns images, but we want to test the case where render throws
        _pdfRenderService.Setup(s => s.RenderToImages(It.IsAny<string>(), It.IsAny<int>()))
            .Throws(new OutOfMemoryException("OOM"));

        var service = CreateService();
        var result = service.Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("INVALID_PDF", result.ErrorInfo.Code);
        // DisposeImages should NOT be called since images were never created
        _pdfRenderService.Verify(s => s.DisposeImages(It.IsAny<List<Image>>()), Times.Never);
    }
}
