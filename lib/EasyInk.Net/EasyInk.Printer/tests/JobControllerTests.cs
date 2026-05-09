using EasyInk.Engine;
using EasyInk.Engine.Services.Abstractions;
using EasyInk.Printer.Api;
using Moq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Printer.Tests;

public class JobControllerTests
{
    private static JobController CreateController(
        Mock<IPrinterService> printerService = null,
        Mock<IPrintService> printService = null)
    {
        printerService ??= new Mock<IPrinterService>();
        printService ??= new Mock<IPrintService>();

        var api = new EngineApi(printerService.Object, printService.Object);
        return new JobController(api);
    }

    [Fact]
    public void GetJobStatus_NotFound_ReturnsError()
    {
        var controller = CreateController();
        var result = JObject.Parse(controller.GetJobStatus("nonexistent"));

        Assert.False(result["success"].ToObject<bool>());
        Assert.Equal("JOB_NOT_FOUND", result["errorInfo"]["code"].ToString());
    }

    [Fact]
    public void GetAllJobs_ReturnsSuccess()
    {
        var controller = CreateController();
        var result = JObject.Parse(controller.GetAllJobs());

        Assert.True(result["success"].ToObject<bool>());
    }
}
