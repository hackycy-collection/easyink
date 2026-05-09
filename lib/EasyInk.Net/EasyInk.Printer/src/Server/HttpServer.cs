using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace EasyInk.Printer.Server;

public class HttpServer
{
    private readonly int _port;
    private readonly SemaphoreSlim _concurrency;
    private HttpListener _listener;
    private CancellationTokenSource _cts;
    private Task _listenTask;

    public int Port => _port;
    public bool IsRunning { get; private set; }
    public string LastError { get; private set; }

    public Func<HttpListenerContext, Task> OnRequest { get; set; }

    public HttpServer(int port, int maxConcurrentRequests = 50)
    {
        _port = port;
        _concurrency = new SemaphoreSlim(maxConcurrentRequests, maxConcurrentRequests);
    }

    public bool TryStart()
    {
        if (IsRunning) return true;

        try
        {
            _listener = new HttpListener();
            _listener.Prefixes.Add($"http://localhost:{_port}/");
            _listener.Start();

            _cts = new CancellationTokenSource();
            IsRunning = true;
            LastError = null;

            _listenTask = Task.Factory.StartNew(
                ListenLoop,
                _cts.Token,
                TaskCreationOptions.LongRunning,
                TaskScheduler.Default);

            return true;
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _listener?.Close();
            _listener = null;
            IsRunning = false;
            return false;
        }
    }

    public void Stop()
    {
        if (!IsRunning) return;

        IsRunning = false;
        _cts?.Cancel();
        try { _listener?.Stop(); }
        catch (Exception ex) { EasyInk.Printer.SimpleLogger.Error("停止监听器异常", ex); }
        try { _listenTask?.Wait(TimeSpan.FromSeconds(3)); }
        catch (Exception ex) { EasyInk.Printer.SimpleLogger.Error("等待监听任务异常", ex); }
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
                    await _concurrency.WaitAsync(_cts.Token);
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await handler(context);
                        }
                        catch (Exception ex)
                        {
                            EasyInk.Printer.SimpleLogger.Error("请求处理异常", ex);
                            try
                            {
                                context.Response.StatusCode = 500;
                                context.Response.Close();
                            }
                            catch { }
                        }
                        finally
                        {
                            _concurrency.Release();
                        }
                    });
                }
            }
            catch (HttpListenerException) { break; }
            catch (ObjectDisposedException) { break; }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                EasyInk.Printer.SimpleLogger.Error("监听异常", ex);
            }
        }
    }
}
