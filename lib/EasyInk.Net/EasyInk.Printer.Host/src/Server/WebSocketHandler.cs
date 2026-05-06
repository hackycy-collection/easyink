using System;
using System.Collections.Concurrent;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Server;

public class WebSocketHandler
{
    private readonly ConcurrentDictionary<string, WebSocket> _connections = new();

    public int ConnectionCount => _connections.Count;

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

        try
        {
            var buffer = new byte[4096];
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;
            }
        }
        catch { }
        finally
        {
            _connections.TryRemove(connectionId, out _);
            try
            {
                if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
            }
            catch { }
            ws.Dispose();
        }
    }

    public async Task Broadcast(string message)
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
            catch
            {
                _connections.TryRemove(kvp.Key, out _);
            }
        }
    }
}
