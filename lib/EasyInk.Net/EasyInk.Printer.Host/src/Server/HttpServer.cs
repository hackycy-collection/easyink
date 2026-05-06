using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace EasyInk.Printer.Host.Server;

public class HttpServer
{
    private readonly int _port;
    private HttpListener _listener;
    private CancellationTokenSource _cts;
    private Task _listenTask;

    public int Port => _port;
    public bool IsRunning { get; private set; }

    public Func<HttpListenerContext, Task> OnRequest;

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
                var handler = OnRequest;
                if (handler != null)
                {
                    Task.Run(async () =>
                    {
                        try
                        {
                            await handler(context);
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
            }
            catch (HttpListenerException) { break; }
            catch (ObjectDisposedException) { break; }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[HttpServer] 监听异常: {ex.Message}");
            }
        }
    }
}
