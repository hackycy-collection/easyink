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
    private const int DefaultMaxQueueSize = 100;

    private readonly IPrintService _printService;
    private readonly Dictionary<string, PrintJob> _jobs = new Dictionary<string, PrintJob>();
    private readonly BlockingCollection<(string requestId, PrintRequestParams request)> _queue;
    private readonly CancellationTokenSource _cts = new CancellationTokenSource();
    private readonly Task _worker;
    private readonly object _jobLock = new object();

    public PrintJobQueue(IPrintService printService, int maxQueueSize = DefaultMaxQueueSize)
    {
        _printService = printService;
        _queue = new BlockingCollection<(string, PrintRequestParams)>(maxQueueSize);
        _worker = Task.Factory.StartNew(
            ProcessQueue,
            _cts.Token,
            TaskCreationOptions.LongRunning,
            TaskScheduler.Default);
    }

    public string Enqueue(string requestId, PrintRequestParams request)
    {
        var jobId = requestId ?? Guid.NewGuid().ToString();
        var job = new PrintJob
        {
            JobId = jobId,
            PrinterName = request.PrinterName,
            Status = "queued"
        };
        lock (_jobLock)
        {
            _jobs[jobId] = job;
        }
        if (!_queue.TryAdd((jobId, request), TimeSpan.FromSeconds(5)))
        {
            lock (_jobLock) { _jobs.Remove(jobId); }
            throw new InvalidOperationException("打印队列已满，请稍后重试");
        }
        return jobId;
    }

    public PrintJob GetJobStatus(string jobId)
    {
        lock (_jobLock)
        {
            if (!_jobs.TryGetValue(jobId, out var info))
                return null;

            return new PrintJob
            {
                JobId = info.JobId,
                PrinterName = info.PrinterName,
                Status = info.Status,
                CreatedAt = info.CreatedAt,
                StartedAt = info.StartedAt,
                CompletedAt = info.CompletedAt,
                ErrorMessage = info.ErrorMessage,
                Result = info.Result
            };
        }
    }

    public List<PrintJob> GetAllJobs()
    {
        lock (_jobLock)
        {
            return _jobs.Values.Select(j => new PrintJob
            {
                JobId = j.JobId,
                PrinterName = j.PrinterName,
                Status = j.Status,
                CreatedAt = j.CreatedAt,
                StartedAt = j.StartedAt,
                CompletedAt = j.CompletedAt,
                ErrorMessage = j.ErrorMessage,
                Result = j.Result
            }).OrderByDescending(j => j.CreatedAt).ToList();
        }
    }

    private void ProcessQueue()
    {
        var processedCount = 0;
        foreach (var (requestId, request) in _queue.GetConsumingEnumerable(_cts.Token))
        {
            PrintJob jobInfo;
            lock (_jobLock)
            {
                if (!_jobs.TryGetValue(requestId, out jobInfo))
                    continue;
                jobInfo.Status = "printing";
                jobInfo.StartedAt = DateTime.UtcNow;
            }

            try
            {
                var response = _printService.Print(requestId, request);
                lock (_jobLock)
                {
                    jobInfo.Result = response;
                    jobInfo.Status = response.Success ? "completed" : "failed";
                    if (!response.Success)
                        jobInfo.ErrorMessage = response.ErrorInfo?.Message;
                }
            }
            catch (Exception ex)
            {
                lock (_jobLock)
                {
                    jobInfo.Status = "failed";
                    jobInfo.ErrorMessage = ex.Message;
                }
                Debug.WriteLine($"[EasyInk.Printer] 打印任务 {requestId} 失败: {ex.Message}");
            }
            finally
            {
                lock (_jobLock) { jobInfo.CompletedAt = DateTime.UtcNow; }
            }

            if (++processedCount % 100 == 0)
                PurgeExpiredJobs();
        }
    }

    private void PurgeExpiredJobs()
    {
        var cutoff = DateTime.UtcNow.AddHours(-1);
        lock (_jobLock)
        {
            var expiredKeys = _jobs
                .Where(kvp => kvp.Value.CompletedAt.HasValue && kvp.Value.CompletedAt.Value < cutoff)
                .Select(kvp => kvp.Key)
                .ToList();
            foreach (var key in expiredKeys)
                _jobs.Remove(key);
        }
    }

    public void Dispose()
    {
        _queue.CompleteAdding();
        try { _worker.Wait(TimeSpan.FromSeconds(30)); }
        catch (AggregateException) { /* 忽略取消异常 */ }
        catch (OperationCanceledException) { }
        _cts.Cancel();
        _cts.Dispose();
        _queue.Dispose();
    }
}
