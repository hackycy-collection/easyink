using System;
using System.Collections.Generic;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;
using Moq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Engine.Tests;

public class PrinterApiTests
{

    private static EngineApi CreateApi(
        Mock<IPrinterService> printerService = null,
        Mock<IPrintService> printService = null)
    {
        printerService ??= new Mock<IPrinterService>();
        printService ??= new Mock<IPrintService>();

        return new EngineApi(
            printerService.Object,
            printService.Object);
    }

    private static string MakeCommand(string command, string id = "test-1", Dictionary<string, object> parms = null)
    {
        return JsonConvert.SerializeObject(new PrinterCommand
        {
            Command = command,
            Id = id,
            Params = parms
        }, JsonConfig.CamelCase);
    }

    [Fact]
    public void HandleCommand_InvalidJson_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(api.HandleCommand("not json"));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("INVALID_JSON", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_UnknownCommand_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(api.HandleCommand(MakeCommand("noSuchCommand")));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.UnknownCommand, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_GetPrinters_ReturnsList()
    {
        var printerService = new Mock<IPrinterService>();
        printerService.Setup(s => s.GetPrinters()).Returns(new List<PrinterInfo>
        {
            new PrinterInfo { Name = "Test Printer", IsDefault = true }
        });

        using var api = CreateApi(printerService: printerService);
        var result = JsonConvert.DeserializeObject<JObject>(api.HandleCommand(MakeCommand("getPrinters")));
        Assert.True(result["success"].ToObject<bool>());
        var data = result["data"] as JArray;
        Assert.Single(data);
        Assert.Equal("Test Printer", data[0]["name"].ToString());
    }

    [Fact]
    public void HandleCommand_GetPrinterStatus_MissingParam_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("getPrinterStatus")));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_Print_MissingParams_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("print")));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_PrintAsync_EnqueuesJob()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        var parms = new Dictionary<string, object>
        {
            ["printerName"] = "Test",
            ["pdfBase64"] = Convert.ToBase64String(new byte[] { 1, 2, 3 })
        };

        using var api = CreateApi(printService: printService);
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("printAsync", parms: parms)));
        Assert.True(result["success"].ToObject<bool>());
        Assert.NotNull(result["data"]["jobId"]);
        Assert.Equal(JobStatus.Queued, result["data"]["status"].ToString());
    }

    [Fact]
    public void HandleCommand_GetJobStatus_NotFound_ReturnsError()
    {
        using var api = CreateApi();
        var parms = new Dictionary<string, object> { ["jobId"] = "nonexistent" };
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("getJobStatus", parms: parms)));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.JobNotFound, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_QueryLogs_NotSupported_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("queryLogs")));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.UnknownCommand, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_BatchPrint_EmptyJobs_ReturnsError()
    {
        using var api = CreateApi();
        var parms = new Dictionary<string, object>
        {
            ["jobs"] = new JArray()
        };
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("batchPrint", parms: parms)));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_MissingPrinterName_ReturnsError()
    {
        using var api = CreateApi();
        var json = api.Print(null, "base64data");
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_MissingPdfSource_ReturnsError()
    {
        using var api = CreateApi();
        var json = api.Print("TestPrinter");
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_MultiplePdfSources_ReturnsError()
    {
        using var api = CreateApi();
        var json = api.Print("TestPrinter", pdfBase64: "base64data", pdfUrl: "http://example.com/test.pdf");
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal(ErrorCode.InvalidParams, result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_WithPdfUrl_Success()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        using var api = CreateApi(printService: printService);
        var json = api.Print("TestPrinter", pdfUrl: "http://example.com/test.pdf");
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.True(result["success"].ToObject<bool>());
    }

    [Fact]
    public void Print_WithPdfBytes_Success()
    {
        var printService = new Mock<IPrintService>();
        printService.Setup(s => s.Print(It.IsAny<string>(), It.IsAny<PrintRequestParams>()))
            .Returns(PrinterResult.Ok("test", PrintResult.Success("job-1")));

        using var api = CreateApi(printService: printService);
        var json = api.Print("TestPrinter", pdfBytes: new byte[] { 1, 2, 3 });
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.True(result["success"].ToObject<bool>());
    }

    [Fact]
    public void Dispose_DisposesJobQueue()
    {
        var printerService = new Mock<IPrinterService>();
        var printService = new Mock<IPrintService>();

        var api = new EngineApi(
            printerService.Object,
            printService.Object);
        api.Dispose();
    }
}
