using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using EasyInk.Engine.Models;
using Newtonsoft.Json;

namespace EasyInk.Printer.Server;

public class WebSocketHandler : IDisposable
{
    private const int MaxBinaryMessageSize = 60 * 1024 * 1024; // 60MB (50MB PDF + 10MB metadata)

    private static readonly TimeSpan PingInterval = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly SemaphoreSlim _broadcastLock = new SemaphoreSlim(1, 1);
    private readonly CancellationTokenSource _cts = new CancellationTokenSource();
    private readonly int _maxConnections;
    private WebSocketCommandHandler _commandHandler;

    public int ConnectionCount => _connections.Count;

    public event Action ConnectionCountChanged;

    public WebSocketHandler(int maxConnections = 100)
    {
        _maxConnections = maxConnections < 10 ? 10 : maxConnections;
        _ = PingLoop();
    }

    public void SetCommandHandler(WebSocketCommandHandler handler)
    {
        _commandHandler = handler;
    }

    private async Task PingLoop()
    {
        var pingPayload = Array.Empty<byte>();
        while (!_cts.IsCancellationRequested)
        {
            try { await Task.Delay(PingInterval, _cts.Token); }
            catch (OperationCanceledException) { break; }

            var tasks = new List<Task>();
            foreach (var kvp in _connections)
            {
                if (kvp.Value.State != WebSocketState.Open)
                {
                    _connections.TryRemove(kvp.Key, out _);
                    continue;
                }
                tasks.Add(SendPingAsync(kvp.Key, kvp.Value, pingPayload));
            }
            await Task.WhenAll(tasks);

            if (_connections.Count == 0)
                ConnectionCountChanged?.Invoke();
        }
    }

    // .NET Framework 4.8 WebSocket does not expose Ping frame sending (no WebSocketMessageType.Ping).
    // Application-level empty binary frame is used as keep-alive instead, which is the pragmatic
    // alternative on this runtime. Migrate to native Ping frames when targeting .NET Core 3.0+.
    private async Task SendPingAsync(string connectionId, WebSocket ws, byte[] payload)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await ws.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Binary, true, cts.Token);
        }
        catch
        {
            _connections.TryRemove(connectionId, out _);
            try { ws.Dispose(); } catch (Exception disposeEx) { SimpleLogger.Debug("WebSocket ping释放异常", disposeEx); }
        }
    }

    public async Task HandleConnection(HttpListenerContext context)
    {
        if (!context.Request.IsWebSocketRequest)
        {
            context.Response.StatusCode = 400;
            context.Response.Close();
            return;
        }

        if (_connections.Count >= _maxConnections)
        {
            context.Response.StatusCode = 429;
            var bytes = Encoding.UTF8.GetBytes("{\"success\":false,\"errorInfo\":{\"code\":\"TooManyConnections\",\"message\":\"" + LangManager.Get("Ws_ConnectionLimit") + "\"}}");
            context.Response.ContentType = "application/json";
            context.Response.ContentLength64 = bytes.Length;
            await context.Response.OutputStream.WriteAsync(bytes, 0, bytes.Length);
            context.Response.Close();
            return;
        }

        var wsContext = await context.AcceptWebSocketAsync(null);
        var ws = wsContext.WebSocket;
        var connectionId = Guid.NewGuid().ToString();
        _connections[connectionId] = ws;
        ConnectionCountChanged?.Invoke();

        try
        {
            await ReceiveLoop(ws);
        }
        catch (WebSocketException) { }
        catch (IOException) { }
        catch (OperationCanceledException) { }
        finally
        {
            _connections.TryRemove(connectionId, out _);
            ConnectionCountChanged?.Invoke();
            try
            {
                if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
                {
                    using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", closeCts.Token);
                }
            }
            catch (WebSocketException) { }
            ws.Dispose();
        }
    }

    private async Task ReceiveLoop(WebSocket ws)
    {
        var buffer = new byte[8192];

        while (ws.State == WebSocketState.Open)
        {
            var messageBuffer = new MemoryStream();
            WebSocketMessageType messageType = WebSocketMessageType.Text;
            bool endOfMessage = false;

            // 接收完整消息（可能分多个帧）
            while (!endOfMessage)
            {
                using var receiveCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), receiveCts.Token);

                if (result.MessageType == WebSocketMessageType.Close)
                    return;

                messageType = result.MessageType;
                endOfMessage = result.EndOfMessage;

                messageBuffer.Write(buffer, 0, result.Count);

                if (messageBuffer.Length > MaxBinaryMessageSize)
                {
                    await SendError(ws, ErrorCode.MessageTooLarge, LangManager.Get("Ws_MessageTooLarge"));
                    return;
                }
            }

            // 处理消息
            if (_commandHandler != null)
            {
                try
                {
                    WebSocketMessage message;
                    if (messageType == WebSocketMessageType.Binary)
                    {
                        message = WebSocketMessage.FromBinary(messageBuffer.ToArray());
                    }
                    else
                    {
                        var json = Encoding.UTF8.GetString(messageBuffer.ToArray());
                        message = WebSocketMessage.FromText(json);
                    }

                    await _commandHandler.HandleMessage(ws, message);
                }
                catch (Exception ex)
                {
                    await SendError(ws, ErrorCode.InvalidMessage, ex.Message);
                }
            }
        }
    }

    private static async Task SendError(WebSocket ws, string code, string errorMessage)
    {
        var errorJson = JsonConvert.SerializeObject(new
        {
            success = false,
            errorInfo = new { code, message = errorMessage }
        });
        var bytes = Encoding.UTF8.GetBytes(errorJson);
        using var sendCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, sendCts.Token);
    }

    public async Task Broadcast(string message)
    {
        await _broadcastLock.WaitAsync();
        try
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            var segment = new ArraySegment<byte>(bytes);

            foreach (var kvp in _connections)
            {
                try
                {
                    if (kvp.Value.State == WebSocketState.Open)
                    {
                        using var bcastCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        await kvp.Value.SendAsync(segment, WebSocketMessageType.Text, true, bcastCts.Token);
                    }
                }
                catch (WebSocketException)
                {
                    _connections.TryRemove(kvp.Key, out _);
                }
                catch (IOException)
                {
                    _connections.TryRemove(kvp.Key, out _);
                }
            }
        }
        finally
        {
            _broadcastLock.Release();
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();
        foreach (var kvp in _connections)
        {
            try { kvp.Value.Dispose(); } catch (Exception ex) { SimpleLogger.Debug("WebSocket连接释放异常", ex); }
        }
        _connections.Clear();
        _broadcastLock.Dispose();
    }
}
