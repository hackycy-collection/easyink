using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace EasyInk.Printer.Server;

public class WebSocketHandler : IDisposable
{
    private const int MaxBinaryMessageSize = 60 * 1024 * 1024; // 60MB (50MB PDF + 10MB metadata)

    private static readonly TimeSpan PingInterval = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly SemaphoreSlim _broadcastLock = new SemaphoreSlim(1, 1);
    private readonly Timer _pingTimer;
    private WebSocketCommandHandler _commandHandler;

    public int ConnectionCount => _connections.Count;

    public event Action ConnectionCountChanged;

    public WebSocketHandler()
    {
        _pingTimer = new Timer(SendPings, null, PingInterval, PingInterval);
    }

    public void SetCommandHandler(WebSocketCommandHandler handler)
    {
        _commandHandler = handler;
    }

    private void SendPings(object state)
    {
        var pingPayload = Array.Empty<byte>();
        foreach (var kvp in _connections)
        {
            try
            {
                if (kvp.Value.State == WebSocketState.Open)
                    kvp.Value.SendAsync(new ArraySegment<byte>(pingPayload), WebSocketMessageType.Binary, true, CancellationToken.None).Wait(5000);
                else
                    _connections.TryRemove(kvp.Key, out _);
            }
            catch
            {
                _connections.TryRemove(kvp.Key, out _);
                try { kvp.Value.Dispose(); } catch { }
            }
        }

        if (_connections.Count == 0)
            ConnectionCountChanged?.Invoke();
    }

    public async Task HandleConnection(HttpListenerContext context)
    {
        if (!context.Request.IsWebSocketRequest)
        {
            context.Response.StatusCode = 400;
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
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
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
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                if (result.MessageType == WebSocketMessageType.Close)
                    return;

                messageType = result.MessageType;
                endOfMessage = result.EndOfMessage;

                messageBuffer.Write(buffer, 0, result.Count);

                if (messageBuffer.Length > MaxBinaryMessageSize)
                {
                    await SendError(ws, "MESSAGE_TOO_LARGE", "消息体过大");
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
                    await SendError(ws, "INVALID_MESSAGE", ex.Message);
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
        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
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
                        await kvp.Value.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
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
        _pingTimer.Dispose();
        foreach (var kvp in _connections)
        {
            try { kvp.Value.Dispose(); } catch { }
        }
        _connections.Clear();
        _broadcastLock.Dispose();
    }
}
