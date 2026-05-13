using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine;

/// <summary>
/// 日志级别
/// </summary>
public enum LogLevel
{
    /// <summary>信息</summary>
    Info,
    /// <summary>错误</summary>
    Error
}

/// <summary>
/// 打印引擎公共API，仅负责打印链路，不含审计持久化
/// </summary>
public class EngineApi : IDisposable
{
    private readonly IPrinterService _printerService;
    private readonly IPrintService _printService;
    private readonly PrintJobQueue _jobQueue;

    /// <summary>
    /// 日志回调事件，订阅方自行决定如何处理日志（写文件、存数据库等）
    /// </summary>
    public static event Action<LogLevel, string> Log;

    /// <summary>
    /// 打印完成回调（requestId, 请求参数, 打印结果），用于审计等宿主层需求
    /// </summary>
    public static event Action<string, PrintRequestParams, PrinterResult> PrintCompleted;

    internal static void RaiseLog(LogLevel level, string message)
    {
        var handler = Log;
        handler?.Invoke(level, message);
    }

    internal static void RaisePrintCompleted(string requestId, PrintRequestParams request, PrinterResult result)
    {
        var handler = PrintCompleted;
        handler?.Invoke(requestId, request, result);
    }

    /// <summary>
    /// 清除所有静态事件订阅，防止进程退出后仍触发回调
    /// </summary>
    public static void ClearEvents()
    {
        Log = null;
        PrintCompleted = null;
    }

    /// <summary>
    /// 初始化打印引擎（使用默认服务实现：Pdfium + Windows Print Spooler）
    /// </summary>
    public EngineApi(int? maxQueueSize = null)
        : this(null, null, maxQueueSize)
    {
    }

    /// <summary>
    /// 初始化打印引擎。
    /// 传入 printService 可替换实现。
    /// </summary>
    public EngineApi(
        IPrinterService printerService = null,
        IPrintService printService = null,
        int? maxQueueSize = null)
    {
        _printerService = printerService ?? new PrinterService();
        _printService = printService
            ?? new PdfiumPrintService(_printerService);
        _jobQueue = new PrintJobQueue(_printService, maxQueueSize ?? 100);
    }

    /// <summary>
    /// 获取打印机列表
    /// </summary>
    public string GetPrinters()
    {
        var printers = _printerService.GetPrinters();
        return JsonConvert.SerializeObject(PrinterResult.Ok("printers", printers), JsonConfig.CamelCase);
    }

    /// <summary>
    /// 获取打印机状态
    /// </summary>
    public string GetPrinterStatus(string printerName)
    {
        if (string.IsNullOrEmpty(printerName))
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", ErrorCode.InvalidParams, "缺少printerName参数"), JsonConfig.CamelCase);
        }

        var status = _printerService.GetPrinterStatus(printerName);
        return JsonConvert.SerializeObject(status, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 同步打印（支持 Base64、URL、二进制三种 PDF 来源）
    /// </summary>
    public string Print(string printerName, string pdfBase64 = null, string pdfUrl = null,
        byte[] pdfBytes = null, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null, bool landscape = false, bool forcePaperSize = false)
    {
        var error = ValidatePrintParams(printerName, pdfBase64, pdfUrl, pdfBytes, copies);
        if (error != null)
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", ErrorCode.InvalidParams, error), JsonConfig.CamelCase);

        var request = BuildPrintRequest(printerName, pdfBase64, pdfUrl, pdfBytes, copies,
            paperWidth, paperHeight, paperUnit, dpi, offsetX, offsetY, offsetUnit, userId, labelType, landscape, forcePaperSize);

        var requestId = Guid.NewGuid().ToString();
        var response = _printService.Print(requestId, request);
        RaisePrintCompleted(requestId, request, response);
        return JsonConvert.SerializeObject(response, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 入队打印（支持 Base64、URL、二进制三种 PDF 来源，立即返回 jobId）
    /// </summary>
    public string EnqueuePrint(string printerName, string pdfBase64 = null, string pdfUrl = null,
        byte[] pdfBytes = null, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null, bool landscape = false, bool forcePaperSize = false)
    {
        var error = ValidatePrintParams(printerName, pdfBase64, pdfUrl, pdfBytes, copies);
        if (error != null)
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", ErrorCode.InvalidParams, error), JsonConfig.CamelCase);

        var request = BuildPrintRequest(printerName, pdfBase64, pdfUrl, pdfBytes, copies,
            paperWidth, paperHeight, paperUnit, dpi, offsetX, offsetY, offsetUnit, userId, labelType, landscape, forcePaperSize);

        try
        {
            var jobId = _jobQueue.Enqueue(null, request);
            return JsonConvert.SerializeObject(new { jobId, status = JobStatus.Queued }, JsonConfig.CamelCase);
        }
        catch (InvalidOperationException ex)
        {
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", ErrorCode.QueueFull, ex.Message), JsonConfig.CamelCase);
        }
    }

    /// <summary>
    /// 批量同步打印
    /// </summary>
    public string BatchPrint(string jobsJson)
    {
        var jobs = DeserializeJobs(jobsJson);
        if (jobs == null)
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", ErrorCode.InvalidParams, "jobs参数无效"), JsonConfig.CamelCase);

        var result = ExecuteBatchJobs(Guid.NewGuid().ToString(), jobs, enqueue: false);
        return JsonConvert.SerializeObject(result, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 批量入队打印
    /// </summary>
    public string EnqueueBatchPrint(string jobsJson)
    {
        var jobs = DeserializeJobs(jobsJson);
        if (jobs == null)
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", ErrorCode.InvalidParams, "jobs参数无效"), JsonConfig.CamelCase);

        var result = ExecuteBatchJobs(Guid.NewGuid().ToString(), jobs, enqueue: true);
        return JsonConvert.SerializeObject(result, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 获取打印任务状态
    /// </summary>
    public string GetJobStatus(string jobId)
    {
        var info = _jobQueue.GetJobStatus(jobId);
        if (info == null)
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error(jobId, ErrorCode.JobNotFound, $"任务不存在: {jobId}"), JsonConfig.CamelCase);
        }
        return JsonConvert.SerializeObject(info, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 获取所有打印任务
    /// </summary>
    public string GetAllJobs()
    {
        var jobs = _jobQueue.GetAllJobs();
        return JsonConvert.SerializeObject(PrinterResult.Ok("all", jobs), JsonConfig.CamelCase);
    }

    /// <summary>
    /// 处理 JSON 命令（统一入口）
    /// </summary>
    public string HandleCommand(string json)
    {
        PrinterCommand request;
        try
        {
            request = JsonConvert.DeserializeObject<PrinterCommand>(json, JsonConfig.CamelCase);
        }
        catch (JsonException)
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", ErrorCode.InvalidJson, "无效的JSON"), JsonConfig.CamelCase);
        }

        if (request == null)
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", ErrorCode.InvalidJson, "无效的JSON"), JsonConfig.CamelCase);
        }

        var response = HandleCommand(request);
        return JsonConvert.SerializeObject(response, JsonConfig.CamelCase);
    }

    /// <summary>
    /// 处理命令（对象入口，避免 JSON 序列化往返）
    /// </summary>
    public PrinterResult HandleCommand(PrinterCommand request)
    {
        switch (request.Command)
        {
            case "getPrinters":
                return PrinterResult.Ok(request.Id, _printerService.GetPrinters());
            case "getPrinterStatus":
                return HandleGetPrinterStatus(request);
            case "print":
                return HandlePrint(request);
            case "printAsync":
                return HandleEnqueuePrint(request);
            case "getJobStatus":
                return HandleGetJobStatus(request);
            case "getAllJobs":
                return PrinterResult.Ok(request.Id, _jobQueue.GetAllJobs());
            case "batchPrint":
                return HandleBatchPrint(request, enqueue: false);
            case "batchPrintAsync":
                return HandleBatchPrint(request, enqueue: true);
            default:
                return PrinterResult.Error(request.Id, ErrorCode.UnknownCommand, $"未知命令: {request.Command}");
        }
    }

    /// <summary>
    /// 释放资源并清除静态事件订阅，防止内存泄漏
    /// </summary>
    public void Dispose()
    {
        _jobQueue.Dispose();
        ClearEvents();
    }

    private static PrintRequestParams BuildPrintRequest(string printerName, string pdfBase64,
        string pdfUrl, byte[] pdfBytes, int copies,
        double? paperWidth, double? paperHeight, string paperUnit, int dpi,
        double? offsetX, double? offsetY, string offsetUnit, string userId, string labelType,
        bool landscape, bool forcePaperSize)
    {
        return new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = pdfBase64,
            PdfUrl = pdfUrl,
            PdfBytes = pdfBytes,
            Copies = copies,
            Dpi = dpi,
            Landscape = landscape,
            ForcePaperSize = forcePaperSize,
            PaperSize = paperWidth.HasValue && paperHeight.HasValue
                ? new PaperSizeParams { Width = paperWidth.Value, Height = paperHeight.Value, Unit = paperUnit }
                : null,
            Offset = offsetX.HasValue || offsetY.HasValue
                ? new OffsetParams { X = offsetX ?? 0, Y = offsetY ?? 0, Unit = offsetUnit }
                : null,
            UserData = !string.IsNullOrEmpty(userId) || !string.IsNullOrEmpty(labelType)
                ? new UserDataParams { UserId = userId, LabelType = labelType }
                : null
        };
    }

    private PrinterResult HandleGetPrinterStatus(PrinterCommand request)
    {
        var printerName = GetParam<string>(request, "printerName");
        if (string.IsNullOrEmpty(printerName))
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "缺少printerName参数");
        }

        var status = _printerService.GetPrinterStatus(printerName);
        return PrinterResult.Ok(request.Id, status);
    }

    private PrinterResult HandlePrint(PrinterCommand request)
    {
        var printParams = ExtractPrintParams(request);
        if (printParams == null)
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "缺少打印参数或格式错误");
        }

        var result = _printService.Print(request.Id, printParams);
        RaisePrintCompleted(request.Id, printParams, result);
        return result;
    }

    private PrinterResult HandleEnqueuePrint(PrinterCommand request)
    {
        var printParams = ExtractPrintParams(request);
        if (printParams == null)
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "缺少打印参数或格式错误");
        }

        try
        {
            var jobId = _jobQueue.Enqueue(request.Id, printParams);
            return PrinterResult.Ok(request.Id, new { jobId, status = JobStatus.Queued });
        }
        catch (InvalidOperationException ex)
        {
            return PrinterResult.Error(request.Id, ErrorCode.QueueFull, ex.Message);
        }
    }

    private PrinterResult HandleGetJobStatus(PrinterCommand request)
    {
        var jobId = GetParam<string>(request, "jobId");
        if (string.IsNullOrEmpty(jobId))
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "缺少jobId参数");
        }

        var info = _jobQueue.GetJobStatus(jobId);
        if (info == null)
        {
            return PrinterResult.Error(request.Id, ErrorCode.JobNotFound, $"任务不存在: {jobId}");
        }
        return PrinterResult.Ok(request.Id, info);
    }

    private PrinterResult HandleBatchPrint(PrinterCommand request, bool enqueue)
    {
        var jobsToken = request.Params != null && request.Params.ContainsKey("jobs")
            ? request.Params["jobs"]
            : null;

        if (jobsToken == null || !(jobsToken is JArray jArr))
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "缺少jobs数组参数");
        }

        var jobs = jArr.ToObject<List<PrintRequestParams>>();
        if (jobs.Count == 0)
        {
            return PrinterResult.Error(request.Id, ErrorCode.InvalidParams, "jobs不能为空");
        }

        return ExecuteBatchJobs(request.Id, jobs, enqueue);
    }

    private PrintRequestParams ExtractPrintParams(PrinterCommand request)
    {
        if (request.Params == null || request.Params.Count == 0)
            return null;

        byte[] pdfBytes = null;
        if (request.Params.TryGetValue("pdfBytes", out var rawPdfBytes))
        {
            if (rawPdfBytes is byte[] bytes)
                pdfBytes = bytes;
            else if (rawPdfBytes is JValue jValue && jValue.Type == JTokenType.Bytes)
                pdfBytes = jValue.ToObject<byte[]>();
        }

        var jObj = JObject.FromObject(request.Params);
        var printParams = jObj.ToObject<PrintRequestParams>();
        if (pdfBytes != null && pdfBytes.Length > 0)
            printParams.PdfBytes = pdfBytes;
        return printParams;
    }

    private T GetParam<T>(PrinterCommand request, string key)
    {
        if (request.Params == null || !request.Params.ContainsKey(key))
        {
            return default;
        }

        var value = request.Params[key];
        if (value is JToken token)
        {
            return token.ToObject<T>();
        }

        var targetType = typeof(T);
        try
        {
            var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;
            var converted = Convert.ChangeType(value, underlyingType);
            return (T)converted;
        }
        catch (Exception ex) when (ex is InvalidCastException || ex is FormatException || ex is OverflowException)
        {
            RaiseLog(LogLevel.Error, $"参数 '{key}' 转换失败: {ex.Message}");
            return default;
        }
    }

    private static string ValidatePrintParams(string printerName, string pdfBase64,
        string pdfUrl, byte[] pdfBytes, int copies)
    {
        if (string.IsNullOrEmpty(printerName))
            return "缺少printerName参数";

        int sourceCount = 0;
        if (!string.IsNullOrEmpty(pdfBase64)) sourceCount++;
        if (!string.IsNullOrEmpty(pdfUrl)) sourceCount++;
        if (pdfBytes != null && pdfBytes.Length > 0) sourceCount++;

        if (sourceCount == 0)
            return "必须提供 PdfBase64、PdfUrl 或 PdfBytes 之一";
        if (sourceCount > 1)
            return "只能提供一种 PDF 来源";

        if (copies < 1)
            return "copies必须大于0";
        return null;
    }

    private List<PrintRequestParams> DeserializeJobs(string jobsJson)
    {
        if (string.IsNullOrEmpty(jobsJson))
            return null;

        try
        {
            var jobs = JsonConvert.DeserializeObject<List<PrintRequestParams>>(jobsJson, JsonConfig.CamelCase);
            return (jobs != null && jobs.Count > 0) ? jobs : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private PrinterResult ExecuteBatchJobs(string requestId, List<PrintRequestParams> jobs, bool enqueue)
    {
        if (enqueue)
        {
            var results = new List<BatchJobResult>(jobs.Count);
            foreach (var job in jobs)
            {
                try
                {
                    var jobId = _jobQueue.Enqueue(null, job);
                    results.Add(new BatchJobResult { JobId = jobId, Status = JobStatus.Queued });
                }
                catch (InvalidOperationException ex)
                {
                    results.Add(new BatchJobResult { JobId = null, Status = JobStatus.Failed, ErrorMessage = ex.Message });
                }
            }
            return PrinterResult.Ok(requestId, new BatchPrintResult { Jobs = results });
        }

        var syncResults = new BatchJobResult[jobs.Count];
        Parallel.For(0, jobs.Count, i =>
        {
            var job = jobs[i];
            var jobId = Guid.NewGuid().ToString();
            var response = _printService.Print(jobId, job);
            RaisePrintCompleted(jobId, job, response);
            syncResults[i] = new BatchJobResult
            {
                JobId = jobId,
                Status = response.Success ? JobStatus.Completed : JobStatus.Failed,
                ErrorMessage = response.Success ? null : response.ErrorInfo?.Message
            };
        });

        return PrinterResult.Ok(requestId, new BatchPrintResult { Jobs = new List<BatchJobResult>(syncResults) });
    }
}
