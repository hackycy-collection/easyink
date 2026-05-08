using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer;

/// <summary>
/// 打印插件公共API
/// 供 Electron 通过 edge-js 或 node-ffi 调用
/// </summary>
public class PrinterApi : IDisposable
{
    private readonly IPrinterService _printerService;
    private readonly IPrintService _printService;
    private readonly IAuditService _auditService;
    private readonly PrintJobQueue _jobQueue;

    private static readonly JsonSerializerSettings _jsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        Formatting = Formatting.None
    };

    /// <summary>
    /// 初始化打印 API（使用默认服务实现，SumatraPDF 直接打印）
    /// </summary>
    public PrinterApi(string dbPath = null, string sumatraPdfExePath = null, string sumatraTempDir = null)
        : this(null, null, null, dbPath, sumatraPdfExePath, sumatraTempDir)
    {
    }

    /// <summary>
    /// 初始化打印 API
    /// </summary>
    public PrinterApi(
        IPrinterService printerService = null,
        IAuditService auditService = null,
        IPrintService printService = null,
        string dbPath = null,
        string sumatraPdfExePath = null,
        string sumatraTempDir = null)
    {
        _printerService = printerService ?? new PrinterService();
        _auditService = auditService ?? new AuditService(dbPath);
        _printService = printService
            ?? new SumatraPrintService(_printerService, _auditService, sumatraPdfExePath, sumatraTempDir);
        _jobQueue = new PrintJobQueue(_printService);
    }

    /// <summary>
    /// 获取打印机列表
    /// </summary>
    public string GetPrinters()
    {
        var printers = _printerService.GetPrinters();
        return JsonConvert.SerializeObject(PrinterResult.Ok("printers", printers), _jsonSettings);
    }

    /// <summary>
    /// 获取打印机状态
    /// </summary>
    public string GetPrinterStatus(string printerName)
    {
        if (string.IsNullOrEmpty(printerName))
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", "INVALID_PARAMS", "缺少printerName参数"), _jsonSettings);
        }

        var status = _printerService.GetPrinterStatus(printerName);
        return JsonConvert.SerializeObject(status, _jsonSettings);
    }

    /// <summary>
    /// 同步打印（支持 Base64、URL、二进制三种 PDF 来源）
    /// </summary>
    public string Print(string printerName, string pdfBase64 = null, string pdfUrl = null,
        byte[] pdfBytes = null, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null, bool landscape = false)
    {
        var error = ValidatePrintParams(printerName, pdfBase64, pdfUrl, pdfBytes, copies);
        if (error != null)
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", "INVALID_PARAMS", error), _jsonSettings);

        var request = BuildPrintRequest(printerName, pdfBase64, pdfUrl, pdfBytes, copies,
            paperWidth, paperHeight, paperUnit, dpi, offsetX, offsetY, offsetUnit, userId, labelType, landscape);

        var response = _printService.Print(Guid.NewGuid().ToString(), request);
        return JsonConvert.SerializeObject(response, _jsonSettings);
    }

    /// <summary>
    /// 异步打印（支持 Base64、URL、二进制三种 PDF 来源）
    /// </summary>
    public string PrintAsync(string printerName, string pdfBase64 = null, string pdfUrl = null,
        byte[] pdfBytes = null, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null, bool landscape = false)
    {
        var error = ValidatePrintParams(printerName, pdfBase64, pdfUrl, pdfBytes, copies);
        if (error != null)
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", "INVALID_PARAMS", error), _jsonSettings);

        var request = BuildPrintRequest(printerName, pdfBase64, pdfUrl, pdfBytes, copies,
            paperWidth, paperHeight, paperUnit, dpi, offsetX, offsetY, offsetUnit, userId, labelType, landscape);

        try
        {
            var jobId = _jobQueue.Enqueue(null, request);
            return JsonConvert.SerializeObject(new { jobId, status = "queued" }, _jsonSettings);
        }
        catch (InvalidOperationException ex)
        {
            return JsonConvert.SerializeObject(PrinterResult.Error("unknown", "QUEUE_FULL", ex.Message), _jsonSettings);
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
                PrinterResult.Error("unknown", "INVALID_PARAMS", "jobs参数无效"), _jsonSettings);

        var result = ExecuteBatchJobs(Guid.NewGuid().ToString(), jobs, async: false);
        return JsonConvert.SerializeObject(result, _jsonSettings);
    }

    /// <summary>
    /// 批量异步打印
    /// </summary>
    public string BatchPrintAsync(string jobsJson)
    {
        var jobs = DeserializeJobs(jobsJson);
        if (jobs == null)
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", "INVALID_PARAMS", "jobs参数无效"), _jsonSettings);

        var result = ExecuteBatchJobs(Guid.NewGuid().ToString(), jobs, async: true);
        return JsonConvert.SerializeObject(result, _jsonSettings);
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
                PrinterResult.Error(jobId, "JOB_NOT_FOUND", $"任务不存在: {jobId}"), _jsonSettings);
        }
        return JsonConvert.SerializeObject(info, _jsonSettings);
    }

    /// <summary>
    /// 获取所有打印任务
    /// </summary>
    public string GetAllJobs()
    {
        var jobs = _jobQueue.GetAllJobs();
        return JsonConvert.SerializeObject(PrinterResult.Ok("all", jobs), _jsonSettings);
    }

    /// <summary>
    /// 查询审计日志
    /// </summary>
    public string QueryLogs(DateTime? startTime = null, DateTime? endTime = null,
        string printerName = null, string userId = null, string status = null,
        int limit = 100, int offset = 0)
    {
        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return JsonConvert.SerializeObject(PrinterResult.Ok("logs", logs), _jsonSettings);
    }

    /// <summary>
    /// 处理 JSON 命令（统一入口）
    /// </summary>
    public string HandleCommand(string json)
    {
        PrinterCommand request;
        try
        {
            request = JsonConvert.DeserializeObject<PrinterCommand>(json, _jsonSettings);
        }
        catch (JsonException)
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", "INVALID_JSON", "无效的JSON"), _jsonSettings);
        }

        if (request == null)
        {
            return JsonConvert.SerializeObject(
                PrinterResult.Error("unknown", "INVALID_JSON", "无效的JSON"), _jsonSettings);
        }

        var response = HandleCommand(request);
        return JsonConvert.SerializeObject(response, _jsonSettings);
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
                return HandlePrintAsync(request);
            case "getJobStatus":
                return HandleGetJobStatus(request);
            case "getAllJobs":
                return PrinterResult.Ok(request.Id, _jobQueue.GetAllJobs());
            case "queryLogs":
                return HandleQueryLogs(request);
            case "batchPrint":
                return HandleBatchPrint(request, async: false);
            case "batchPrintAsync":
                return HandleBatchPrint(request, async: true);
            default:
                return PrinterResult.Error(request.Id, "UNKNOWN_COMMAND", $"未知命令: {request.Command}");
        }
    }

    /// <summary>
    /// 释放资源
    /// </summary>
    public void Dispose()
    {
        _jobQueue.Dispose();
    }

    private static PrintRequestParams BuildPrintRequest(string printerName, string pdfBase64,
        string pdfUrl, byte[] pdfBytes, int copies,
        double? paperWidth, double? paperHeight, string paperUnit, int dpi,
        double? offsetX, double? offsetY, string offsetUnit, string userId, string labelType,
        bool landscape)
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
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "缺少printerName参数");
        }

        var status = _printerService.GetPrinterStatus(printerName);
        return PrinterResult.Ok(request.Id, status);
    }

    private PrinterResult HandlePrint(PrinterCommand request)
    {
        var printParams = ExtractPrintParams(request);
        if (printParams == null)
        {
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "缺少打印参数或格式错误");
        }

        return _printService.Print(request.Id, printParams);
    }

    private PrinterResult HandlePrintAsync(PrinterCommand request)
    {
        var printParams = ExtractPrintParams(request);
        if (printParams == null)
        {
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "缺少打印参数或格式错误");
        }

        try
        {
            var jobId = _jobQueue.Enqueue(request.Id, printParams);
            return PrinterResult.Ok(request.Id, new { jobId, status = "queued" });
        }
        catch (InvalidOperationException ex)
        {
            return PrinterResult.Error(request.Id, "QUEUE_FULL", ex.Message);
        }
    }

    private PrinterResult HandleGetJobStatus(PrinterCommand request)
    {
        var jobId = GetParam<string>(request, "jobId");
        if (string.IsNullOrEmpty(jobId))
        {
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "缺少jobId参数");
        }

        var info = _jobQueue.GetJobStatus(jobId);
        if (info == null)
        {
            return PrinterResult.Error(request.Id, "JOB_NOT_FOUND", $"任务不存在: {jobId}");
        }
        return PrinterResult.Ok(request.Id, info);
    }

    private PrinterResult HandleBatchPrint(PrinterCommand request, bool async)
    {
        var jobsToken = request.Params != null && request.Params.ContainsKey("jobs")
            ? request.Params["jobs"]
            : null;

        if (jobsToken == null || !(jobsToken is JArray jArr))
        {
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "缺少jobs数组参数");
        }

        var jobs = jArr.ToObject<List<PrintRequestParams>>();
        if (jobs.Count == 0)
        {
            return PrinterResult.Error(request.Id, "INVALID_PARAMS", "jobs不能为空");
        }

        return ExecuteBatchJobs(request.Id, jobs, async);
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

        // 直接从 Params 字典构造 JObject 再反序列化
        var jObj = JObject.FromObject(request.Params);
        var printParams = jObj.ToObject<PrintRequestParams>();
        if (pdfBytes != null && pdfBytes.Length > 0)
            printParams.PdfBytes = pdfBytes;
        return printParams;
    }

    private PrinterResult HandleQueryLogs(PrinterCommand request)
    {
        var startTime = GetParam<DateTime?>(request, "startTime");
        var endTime = GetParam<DateTime?>(request, "endTime");
        var printerName = GetParam<string>(request, "printerName");
        var userId = GetParam<string>(request, "userId");
        var status = GetParam<string>(request, "status");
        var limit = GetParam<int?>(request, "limit") ?? 100;
        var offset = GetParam<int?>(request, "offset") ?? 0;

        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return PrinterResult.Ok(request.Id, logs);
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
        catch (Exception ex)
        {
            SimpleLogger.Error($"参数 '{key}' 转换失败", ex);
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
            var jobs = JsonConvert.DeserializeObject<List<PrintRequestParams>>(jobsJson, _jsonSettings);
            return (jobs != null && jobs.Count > 0) ? jobs : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private PrinterResult ExecuteBatchJobs(string requestId, List<PrintRequestParams> jobs, bool async)
    {
        var results = new List<BatchJobResult>();

        foreach (var job in jobs)
        {
            if (async)
            {
                try
                {
                    var jobId = _jobQueue.Enqueue(null, job);
                    results.Add(new BatchJobResult { JobId = jobId, Status = "queued" });
                }
                catch (InvalidOperationException ex)
                {
                    results.Add(new BatchJobResult { JobId = null, Status = "failed", ErrorMessage = ex.Message });
                }
            }
            else
            {
                var jobId = Guid.NewGuid().ToString();
                var response = _printService.Print(jobId, job);
                results.Add(new BatchJobResult
                {
                    JobId = jobId,
                    Status = response.Success ? "completed" : "failed",
                    ErrorMessage = response.Success ? null : response.ErrorInfo?.Message
                });
            }
        }

        return PrinterResult.Ok(requestId, new BatchPrintResult { Jobs = results });
    }
}
