using System;
using System.Collections.Specialized;
using EasyInk.Printer.Api;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;
using Moq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace EasyInk.Printer.Tests;

public class LogControllerTests
{
    [Fact]
    public void QueryLogs_EmptyQuery_ReturnsSuccess()
    {
        var auditService = new Mock<IAuditService>();
        auditService.Setup(s => s.QueryLogs(
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<int>(), It.IsAny<int>()))
            .Returns(new System.Collections.Generic.List<PrintAuditLog>());

        var controller = new LogController(auditService.Object);
        var query = new NameValueCollection();
        var result = JObject.Parse(controller.QueryLogs(query));

        Assert.True(result["success"].ToObject<bool>());
    }

    [Fact]
    public void QueryLogs_WithFilter_PassesParams()
    {
        var auditService = new Mock<IAuditService>();
        auditService.Setup(s => s.QueryLogs(
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<int>(), It.IsAny<int>()))
            .Returns(new System.Collections.Generic.List<PrintAuditLog>());

        var controller = new LogController(auditService.Object);
        var query = new NameValueCollection
        {
            ["printerName"] = "TestPrinter",
            ["status"] = "Success",
            ["limit"] = "50",
            ["offset"] = "10"
        };
        controller.QueryLogs(query);

        auditService.Verify(s => s.QueryLogs(
            null, null, "TestPrinter", null, "Success", 50, 10), Times.Once);
    }
}
