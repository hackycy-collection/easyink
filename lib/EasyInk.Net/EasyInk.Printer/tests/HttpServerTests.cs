using EasyInk.Printer.Server;
using Xunit;

namespace EasyInk.Printer.Tests;

public class HttpServerTests
{
    [Fact]
    public void Constructor_SetsPort()
    {
        var server = new HttpServer(18080);
        Assert.Equal(18080, server.Port);
        Assert.False(server.IsRunning);
    }

    [Fact]
    public void Constructor_DefaultConcurrency()
    {
        var server = new HttpServer(9999);
        Assert.Equal(9999, server.Port);
    }

    [Fact]
    public void Stop_BeforeStart_DoesNotThrow()
    {
        var server = new HttpServer(18081);
        server.Stop();
    }

    [Fact]
    public void OnRequest_SetAndGet()
    {
        var server = new HttpServer(18082);
        Assert.Null(server.OnRequest);

        server.OnRequest = ctx => System.Threading.Tasks.Task.CompletedTask;
        Assert.NotNull(server.OnRequest);
    }
}
