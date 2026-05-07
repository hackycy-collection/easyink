using System;
using System.Collections.Generic;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;
using Moq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Printer.Tests;

public class PrinterApiTests
{
    private static readonly JsonSerializerSettings JsonSettings = new()
    {
        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
    };

    private static PrinterApi CreateApi(
        Mock<IPrinterService> printerService = null,
        Mock<IPrintService> printService = null,
        Mock<IAuditService> auditService = null,
        Mock<IPdfRenderService> pdfRenderService = null)
    {
        printerService ??= new Mock<IPrinterService>();
        printService ??= new Mock<IPrintService>();
        auditService ??= new Mock<IAuditService>();
        pdfRenderService ??= new Mock<IPdfRenderService>();

        return new PrinterApi(
            printerService.Object,
            pdfRenderService.Object,
            auditService.Object,
            printService.Object);
    }

    private static string MakeCommand(string command, string id = "test-1", Dictionary<string, object> parms = null)
    {
        return JsonConvert.SerializeObject(new PrinterCommand
        {
            Command = command,
            Id = id,
            Params = parms
        }, JsonSettings);
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
        Assert.Equal("UNKNOWN_COMMAND", result["errorInfo"]["code"].ToString());
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
        Assert.Equal("INVALID_PARAMS", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_Print_MissingParams_ReturnsError()
    {
        using var api = CreateApi();
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("print")));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("INVALID_PARAMS", result["errorInfo"]["code"].ToString());
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
        Assert.Equal("queued", result["data"]["status"].ToString());
    }

    [Fact]
    public void HandleCommand_GetJobStatus_NotFound_ReturnsError()
    {
        using var api = CreateApi();
        var parms = new Dictionary<string, object> { ["jobId"] = "nonexistent" };
        var result = JsonConvert.DeserializeObject<JObject>(
            api.HandleCommand(MakeCommand("getJobStatus", parms: parms)));
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("JOB_NOT_FOUND", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void HandleCommand_QueryLogs_PassesParameters()
    {
        var auditService = new Mock<IAuditService>();
        auditService.Setup(s => s.QueryLogs(
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<int>(), It.IsAny<int>()))
            .Returns(new List<PrintAuditLog>());

        var parms = new Dictionary<string, object>
        {
            ["limit"] = 50,
            ["offset"] = 10,
            ["printerName"] = "MyPrinter"
        };

        using var api = CreateApi(auditService: auditService);
        api.HandleCommand(MakeCommand("queryLogs", parms: parms));
        auditService.Verify(s => s.QueryLogs(
            null, null, "MyPrinter", null, null, 50, 10), Times.Once);
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
        Assert.Equal("INVALID_PARAMS", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_MissingPrinterName_ReturnsError()
    {
        using var api = CreateApi();
        var json = api.Print(null, "base64data");
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("INVALID_PARAMS", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Print_MissingPdfBase64_ReturnsError()
    {
        using var api = CreateApi();
        var json = api.Print("TestPrinter", null);
        var result = JsonConvert.DeserializeObject<JObject>(json);
        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("INVALID_PARAMS", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void Dispose_DisposesOwnedServices()
    {
        var printerService = new Mock<IPrinterService>();
        var printService = new Mock<IPrintService>();
        var auditService = new Mock<IAuditService>();
        var pdfRenderService = new Mock<IPdfRenderService>();

        var api = new PrinterApi(
            printerService.Object,
            pdfRenderService.Object,
            auditService.Object,
            printService.Object);
        api.Dispose();
    }
}
