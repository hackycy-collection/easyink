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

    public event Action<HttpListenerContext> OnRequest;

    public HttpServer(int port)
    {
        _port = port;
    }

    public void Start()
    {
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
        IsRunning = false;
        _cts?.Cancel();
        _listener?.Stop();
        try { _listenTask?.Wait(TimeSpan.FromSeconds(3)); }
        catch { }
        _cts?.Dispose();
        _listener?.Close();
    }

    private async Task ListenLoop()
    {
        while (!_cts.Token.IsCancellationRequested)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                Task.Run(() => OnRequest?.Invoke(context));
            }
            catch (HttpListenerException)
            {
                // 服务器停止时会抛出此异常
                break;
            }
            catch (Exception)
            {
                // 其他异常，继续监听
            }
        }
    }
}
