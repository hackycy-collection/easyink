using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Server;

/// <summary>
/// WebSocket 连接管理与消息推送
/// </summary>
public class WebSocketHandler
{
    private readonly ConcurrentDictionary<string, WebSocket> _connections = new();

    public int ConnectionCount => _connections.Count;

    public event Action<string> OnLog;

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

        OnLog?.Invoke($"WebSocket 连接建立: {connectionId}");

        try
        {
            var buffer = new byte[4096];
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await HandleMessage(connectionId, message);
            }
        }
        catch (Exception ex)
        {
            OnLog?.Invoke($"WebSocket 异常: {connectionId} - {ex.Message}");
        }
        finally
        {
            _connections.TryRemove(connectionId, out _);
            if (ws.State == WebSocketState.Open || ws.State == WebSocketState.CloseReceived)
            {
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
            }
            ws.Dispose();
            OnLog?.Invoke($"WebSocket 连接关闭: {connectionId}");
        }
    }

    private async Task HandleMessage(string connectionId, string message)
    {
        // 目前仅支持订阅消息，后续可扩展
        await Task.CompletedTask;
    }

    /// <summary>
    /// 向所有连接广播消息
    /// </summary>
    public async Task Broadcast(string message)
    {
        var bytes = Encoding.UTF8.GetBytes(message);
        var segment = new ArraySegment<byte>(bytes);

        foreach (var kvp in _connections)
        {
            try
            {
                if (kvp.Value.State == WebSocketState.Open)
                {
                    await kvp.Value.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
                }
            }
            catch
            {
                // 发送失败，连接可能已断开
            }
        }
    }
}
