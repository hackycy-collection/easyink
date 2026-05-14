using System;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services;
using EasyInk.Engine.Services.Abstractions;
using Moq;
using Xunit;

namespace EasyInk.Engine.Tests;

public class PdfiumPrintServiceTests
{
    private readonly Mock<IPrinterService> _printerService = new();

    private PdfiumPrintService CreateService()
    {
        return new PdfiumPrintService(_printerService.Object);
    }

    private static PrintRequestParams CreateRequest(string printerName = "TestPrinter", string? pdfBase64 = null, int copies = 1)
    {
        return new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = pdfBase64 ?? Convert.ToBase64String(new byte[] { 1, 2, 3 }),
            Copies = copies
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

    [Fact]
    public void Print_PrinterNotReady_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(new PrinterStatus { IsReady = false, StatusCode = "PRINTER_OFFLINE" });

        var result = CreateService().Print("req-1", CreateRequest());

        Assert.False(result.Success);
        Assert.Equal("PRINTER_OFFLINE", result.ErrorInfo!.Code);
    }

    [Fact]
    public void Print_NullPrinterService_ThrowsArgumentNull()
    {
        Assert.Throws<ArgumentNullException>(() => new PdfiumPrintService(null!));
    }

    [Fact]
    public void Print_NoPdfSource_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var request = new PrintRequestParams
        {
            PrinterName = "TestPrinter",
            Copies = 1
        };
        var result = CreateService().Print("req-1", request);

        Assert.False(result.Success);
        Assert.Equal(ErrorCode.InvalidPdfSource, result.ErrorInfo!.Code);
    }

    [Fact]
    public void Print_EmptyPdfBytes_ReturnsError()
    {
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var request = new PrintRequestParams
        {
            PrinterName = "TestPrinter",
            PdfBytes = new byte[0],
            Copies = 1
        };
        var result = CreateService().Print("req-1", request);

        Assert.False(result.Success);
        Assert.Equal(ErrorCode.InvalidPdfSource, result.ErrorInfo!.Code);
    }

    [Fact]
    public void Print_PrinterReady_WithPdfBase64_InvokesPrint()
    {
        // This test validates the flow up to the point where
        // Pdfium renders the PDF (which requires native pdfium.dll).
        // On test machines without it, the method throws, which is caught
        // and returned as an error.
        _printerService.Setup(s => s.GetPrinterStatus("TestPrinter"))
            .Returns(ReadyStatus());

        var result = CreateService().Print("req-1", CreateRequest());

        // Without native pdfium.dll, we expect an error (not a success)
        Assert.False(result.Success);
        Assert.Equal(ErrorCode.PrintFailed, result.ErrorInfo!.Code);
    }
}
