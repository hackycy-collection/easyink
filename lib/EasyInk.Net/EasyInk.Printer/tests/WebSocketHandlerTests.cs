using EasyInk.Printer.Server;
using Xunit;

namespace EasyInk.Printer.Tests;

public class WebSocketHandlerTests
{
    [Fact]
    public void ConnectionCount_InitiallyZero()
    {
        var handler = new WebSocketHandler();
        Assert.Equal(0, handler.ConnectionCount);
    }

    [Fact]
    public void ConnectionCountChanged_EventCanBeSubscribed()
    {
        var handler = new WebSocketHandler();
        var fired = false;
        handler.ConnectionCountChanged += () => fired = true;
        Assert.False(fired);
    }
}
