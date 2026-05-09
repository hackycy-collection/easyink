using System;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;
using EasyInk.Printer.Api;
using Moq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Printer.Tests;

public class PrintControllerTests
{
    private static PrintController CreateController(
        Mock<IPrinterService> printerService = null,
        Mock<IPrintService> printService = null)
    {
        printerService ??= new Mock<IPrinterService>();
        printService ??= new Mock<IPrintService>();

        var api = new EngineApi(printerService.Object, printService.Object);
        return new PrintController(api);
    }

    [Fact]
    public void Print_WithJsonBody_CallsEngineApi()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        var controller = CreateController(printService: printService);
        var body = @"{""printerName"":""TestPrinter"",""pdfBase64"":""AQID""}";
        var result = JObject.Parse(controller.Print(body));

        Assert.True(result["success"].ToObject<bool>());
    }

    [Fact]
    public void Print_WithPdfBytes_CallsEngineApi()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        var controller = CreateController(printService: printService);
        var body = @"{""printerName"":""TestPrinter""}";
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
        var result = JObject.Parse(controller.Print(body, pdfBytes));

        Assert.True(result["success"].ToObject<bool>());
    }

    [Fact]
    public void Print_MissingParams_ReturnsError()
    {
        var controller = CreateController();
        var result = JObject.Parse(controller.Print("{}"));

        Assert.False(result["success"].ToObject<bool>());
    }

    [Fact]
    public void PrintAsync_EnqueuesJob()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        var controller = CreateController(printService: printService);
        var body = @"{""printerName"":""TestPrinter"",""pdfBase64"":""AQID""}";
        var result = JObject.Parse(controller.PrintAsync(body));

        Assert.True(result["success"].ToObject<bool>());
        Assert.Equal(JobStatus.Queued, result["data"]["status"].ToString());
    }

    [Fact]
    public void BatchPrint_EmptyBody_ReturnsError()
    {
        var controller = CreateController();
        var result = JObject.Parse(controller.BatchPrint(""));

        Assert.False(result["success"].ToObject<bool>());
    }

    [Fact]
    public void BatchPrint_ArrayBody_CallsEngineApi()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        var controller = CreateController(printService: printService);
        var body = @"[{""printerName"":""P1"",""pdfBase64"":""AQID""}]";
        var result = JObject.Parse(controller.BatchPrint(body));

        Assert.True(result["success"].ToObject<bool>());
    }
}
