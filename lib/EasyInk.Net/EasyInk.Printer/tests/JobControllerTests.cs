using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;
using EasyInk.Printer.Api;
using Moq;
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
        var result = controller.GetJobStatus("nonexistent");

        Assert.False(result.Success);
        Assert.Equal(ErrorCode.JobNotFound, result.ErrorInfo.Code);
    }

    [Fact]
    public void GetAllJobs_ReturnsSuccess()
    {
        var controller = CreateController();
        var result = controller.GetAllJobs();

        Assert.True(result.Success);
    }
}
