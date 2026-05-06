using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services;

public class PrintJobQueue : IDisposable
{
    private readonly IPrintService _printService;
    private readonly ConcurrentDictionary<string, PrintJob> _jobs = new();
    private readonly BlockingCollection<(string requestId, PrintRequestParams request)> _queue = new();
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _worker;

    public PrintJobQueue(IPrintService printService)
    {
        _printService = printService;
        _worker = Task.Factory.StartNew(
            ProcessQueue,
            _cts.Token,
            TaskCreationOptions.LongRunning,
            TaskScheduler.Default);
    }

    public string Enqueue(string requestId, PrintRequestParams request)
    {
        var jobId = requestId ?? Guid.NewGuid().ToString();
        _jobs[jobId] = new PrintJob
        {
            JobId = jobId,
            PrinterName = request.PrinterName,
            Status = "queued"
        };
        _queue.Add((jobId, request));
        return jobId;
    }

    public PrintJob GetJobStatus(string jobId)
    {
        _jobs.TryGetValue(jobId, out var info);
        return info;
    }

    public List<PrintJob> GetAllJobs()
    {
        return _jobs.Values.OrderByDescending(j => j.CreatedAt).ToList();
    }

    private void ProcessQueue()
    {
        foreach (var (requestId, request) in _queue.GetConsumingEnumerable(_cts.Token))
        {
            if (!_jobs.TryGetValue(requestId, out var jobInfo))
                continue;

            jobInfo.Status = "printing";
            jobInfo.StartedAt = DateTime.UtcNow;

            try
            {
                var response = _printService.Print(requestId, request);
                jobInfo.Result = response;
                jobInfo.Status = response.Success ? "completed" : "failed";
                if (!response.Success)
                    jobInfo.ErrorMessage = response.ErrorInfo?.Message;
            }
            catch (Exception ex)
            {
                jobInfo.Status = "failed";
                jobInfo.ErrorMessage = ex.Message;
                Debug.WriteLine($"[EasyInk.Printer] 打印任务 {requestId} 失败: {ex.Message}");
            }
            finally
            {
                jobInfo.CompletedAt = DateTime.UtcNow;
            }
        }
    }

    public void Dispose()
    {
        _queue.CompleteAdding();
        _cts.Cancel();
        try { _worker.Wait(TimeSpan.FromSeconds(5)); }
        catch { /* 忽略取消异常 */ }
        _cts.Dispose();
        _queue.Dispose();
    }
}
