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

/// <summary>
/// 打印任务队列，异步处理打印请求
/// </summary>
public class PrintJobQueue : IDisposable
{
    private const int DefaultMaxQueueSize = 100;

    private readonly IPrintService _printService;
    private readonly Dictionary<string, PrintJob> _jobs = new Dictionary<string, PrintJob>();
    private readonly BlockingCollection<(string requestId, PrintRequestParams request)> _queue;
    private readonly CancellationTokenSource _cts = new CancellationTokenSource();
    private readonly Task _worker;
    private readonly object _jobLock = new object();

    /// <summary>
    /// 初始化打印任务队列
    /// </summary>
    /// <param name="printService">打印服务</param>
    /// <param name="maxQueueSize">队列最大容量</param>
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

    /// <summary>
    /// 将打印任务加入队列
    /// </summary>
    /// <param name="requestId">请求ID</param>
    /// <param name="request">打印请求参数</param>
    /// <returns>任务ID</returns>
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

    /// <summary>
    /// 获取指定任务的状态
    /// </summary>
    /// <param name="jobId">任务ID</param>
    /// <returns>任务信息，不存在时返回 null</returns>
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

    /// <summary>
    /// 获取所有任务列表
    /// </summary>
    /// <returns>按创建时间倒序排列的任务列表</returns>
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

    /// <summary>
    /// 释放队列资源
    /// </summary>
    public void Dispose()
    {
        _queue.CompleteAdding();
        _cts.Cancel();
        try { _worker.Wait(TimeSpan.FromSeconds(30)); }
        catch (Exception) { }
        _cts.Dispose();
        _queue.Dispose();
    }
}
