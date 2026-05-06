using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace EasyInk.Printer.Host.Server;

/// <summary>
/// HTTP 服务器，基于 HttpListener
/// </summary>
public class HttpServer
{
    private readonly int _port;
    private HttpListener _listener;
    private CancellationTokenSource _cts;
    private Task _listenTask;

    public int Port => _port;
    public bool IsRunning { get; private set; }

    /// <summary>
    /// 收到请求时触发（包含 HTTP 和 WebSocket）
    /// </summary>
    public event Action<HttpListenerContext> OnRequest;

    public HttpServer(int port)
    {
        _port = port;
    }

    public void Start()
    {
        if (IsRunning) return;

        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://localhost:{_port}/");
        _listener.Start();

        _cts = new CancellationTokenSource();
        IsRunning = true;

        _listenTask = Task.Factory.StartNew(
            ListenLoop,
            _cts.Token,
            TaskCreationOptions.LongRunning,
            TaskScheduler.Default);
    }

    public void Stop()
    {
        if (!IsRunning) return;

        IsRunning = false;
        _cts?.Cancel();
        try { _listener?.Stop(); } catch { }
        try { _listenTask?.Wait(TimeSpan.FromSeconds(3)); } catch { }
        _cts?.Dispose();
        _listener?.Close();
        _listener = null;
    }

    private async Task ListenLoop()
    {
        while (!_cts.Token.IsCancellationRequested)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                // 每个请求在独立线程处理
                Task.Run(() =>
                {
                    try
                    {
                        OnRequest?.Invoke(context);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[HttpServer] 请求处理异常: {ex.Message}");
                        try
                        {
                            context.Response.StatusCode = 500;
                            context.Response.Close();
                        }
                        catch { }
                    }
                });
            }
            catch (HttpListenerException)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[HttpServer] 监听异常: {ex.Message}");
            }
        }
    }
}
