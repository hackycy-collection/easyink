using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services;

namespace EasyInk.Printer;

/// <summary>
/// 打印插件公共API
/// 供 Electron 通过 edge-js 或 node-ffi 调用
/// </summary>
public class PrinterApi
{
    private readonly PrinterService _printerService;
    private readonly PrintService _printService;
    private readonly AuditService _auditService;
    private readonly PdfRenderService _pdfRenderService;

    private static readonly JsonSerializerSettings _jsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        Formatting = Formatting.None
    };

    public PrinterApi(string dbPath = null)
    {
        _printerService = new PrinterService();
        _pdfRenderService = new PdfRenderService();
        _auditService = new AuditService(dbPath);
        _printService = new PrintService(_printerService, _pdfRenderService, _auditService);
    }

    /// <summary>
    /// 获取打印机列表
    /// </summary>
    public string GetPrinters()
    {
        var printers = _printerService.GetPrinters();
        return JsonConvert.SerializeObject(printers, _jsonSettings);
    }

    /// <summary>
    /// 获取打印机状态
    /// </summary>
    public string GetPrinterStatus(string printerName)
    {
        var status = _printerService.GetPrinterStatus(printerName);
        return JsonConvert.SerializeObject(status, _jsonSettings);
    }

    /// <summary>
    /// 打印PDF
    /// </summary>
    public string Print(string printerName, string pdfBase64, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null)
    {
        var request = new PrintRequestParams
        {
            PrinterName = printerName,
            PdfBase64 = pdfBase64,
            Copies = copies,
            Dpi = dpi,
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

        var response = _printService.Print(Guid.NewGuid().ToString(), request);
        return JsonConvert.SerializeObject(response, _jsonSettings);
    }

    /// <summary>
    /// 查询审计日志
    /// </summary>
    public string QueryLogs(DateTime? startTime = null, DateTime? endTime = null,
        string printerName = null, string userId = null, string status = null,
        int limit = 100, int offset = 0)
    {
        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return JsonConvert.SerializeObject(logs, _jsonSettings);
    }

    /// <summary>
    /// 处理JSON命令（兼容stdin模式）
    /// </summary>
    public string HandleCommand(string json)
    {
        var request = JsonConvert.DeserializeObject<CommandRequest>(json, _jsonSettings);
        if (request == null)
        {
            return JsonConvert.SerializeObject(
                CommandResponse.Error("unknown", "INVALID_JSON", "无效的JSON"), _jsonSettings);
        }

        CommandResponse response;
        switch (request.Command)
        {
            case "getPrinters":
                response = CommandResponse.Ok(request.Id, _printerService.GetPrinters());
                break;
            case "getPrinterStatus":
                response = HandleGetPrinterStatus(request);
                break;
            case "print":
                response = HandlePrint(request);
                break;
            case "queryLogs":
                response = HandleQueryLogs(request);
                break;
            default:
                response = CommandResponse.Error(request.Id, "UNKNOWN_COMMAND", $"未知命令: {request.Command}");
                break;
        }

        return JsonConvert.SerializeObject(response, _jsonSettings);
    }

    private CommandResponse HandleGetPrinterStatus(CommandRequest request)
    {
        var printerName = GetParam<string>(request, "printerName");
        if (string.IsNullOrEmpty(printerName))
        {
            return CommandResponse.Error(request.Id, "INVALID_PARAMS", "缺少printerName参数");
        }

        var status = _printerService.GetPrinterStatus(printerName);
        return CommandResponse.Ok(request.Id, status);
    }

    private CommandResponse HandlePrint(CommandRequest request)
    {
        var paramsToken = request.Params != null && request.Params.ContainsKey("params")
            ? request.Params["params"]
            : null;

        if (paramsToken == null)
        {
            return CommandResponse.Error(request.Id, "INVALID_PARAMS", "缺少打印参数");
        }

        PrintRequestParams printParams;
        if (paramsToken is JObject jObj)
        {
            printParams = jObj.ToObject<PrintRequestParams>();
        }
        else if (paramsToken is PrintRequestParams p)
        {
            printParams = p;
        }
        else
        {
            return CommandResponse.Error(request.Id, "INVALID_PARAMS", "参数格式错误");
        }

        return _printService.Print(request.Id, printParams);
    }

    private CommandResponse HandleQueryLogs(CommandRequest request)
    {
        var startTime = GetParam<DateTime?>(request, "startTime");
        var endTime = GetParam<DateTime?>(request, "endTime");
        var printerName = GetParam<string>(request, "printerName");
        var userId = GetParam<string>(request, "userId");
        var status = GetParam<string>(request, "status");
        var limit = GetParam<int?>(request, "limit") ?? 100;
        var offset = GetParam<int?>(request, "offset") ?? 0;

        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return CommandResponse.Ok(request.Id, logs);
    }

    private T GetParam<T>(CommandRequest request, string key)
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

        try
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[EasyInk.Printer] 参数 '{key}' 转换失败: {ex.Message}");
            return default;
        }
    }
}
