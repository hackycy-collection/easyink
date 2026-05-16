using System;
using System.Net;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
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

    [Fact]
    public void IsExpectedDisconnectException_TreatsHttpListenerExceptionAsDisconnect()
    {
        var exception = new HttpListenerException(64);

        Assert.True(WebSocketHandler.IsExpectedDisconnectException(exception));
        Assert.True(WebSocketHandler.IsExpectedDisconnectException(new AggregateException(exception)));
    }

    [Fact]
    public void IsExpectedDisconnectException_DoesNotHideUnexpectedExceptions()
    {
        Assert.False(WebSocketHandler.IsExpectedDisconnectException(new InvalidOperationException("unexpected")));
    }

    [Fact]
    public async Task CloseQuietlyAsync_HttpListenerException_AbortsAndDisposesSocket()
    {
        var socket = new ThrowingCloseWebSocket(new HttpListenerException(64));

        await WebSocketHandler.CloseQuietlyAsync(socket);

        Assert.True(socket.Aborted);
        Assert.True(socket.Disposed);
    }
}

internal sealed class ThrowingCloseWebSocket : WebSocket
{
    private readonly Exception _closeException;

    public ThrowingCloseWebSocket(Exception closeException)
    {
        _closeException = closeException;
    }

    public bool Aborted { get; private set; }
    public bool Disposed { get; private set; }
    public override WebSocketCloseStatus? CloseStatus => null;
    public override string? CloseStatusDescription => null;
    public override WebSocketState State => WebSocketState.Open;
    public override string? SubProtocol => null;

    public override void Abort()
    {
        Aborted = true;
    }

    public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
    {
        throw _closeException;
    }

    public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        Disposed = true;
    }

    public override Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
    {
        throw new NotSupportedException();
    }

    public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
    {
        throw new NotSupportedException();
    }
}
