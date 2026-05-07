using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Printer;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Host.Server;

public class WebSocketCommandHandler
{
    private readonly PrinterApi _api;
    private readonly WebSocketHandler _wsHandler;

    private static readonly JsonSerializerSettings JsonSettings = new()
    {
        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()
    };

    public WebSocketCommandHandler(PrinterApi api, WebSocketHandler wsHandler)
    {
        _api = api;
        _wsHandler = wsHandler;
    }

    public async Task HandleMessage(WebSocket ws, WebSocketMessage message)
    {
        string result;

        try
        {
            result = message.Command switch
            {
                "print" => HandlePrint(message),
                "printAsync" => HandlePrintAsync(message),
                "getPrinters" => _api.GetPrinters(),
                "getPrinterStatus" => HandleGetPrinterStatus(message),
                "getJobStatus" => HandleGetJobStatus(message),
                "getAllJobs" => _api.GetAllJobs(),
                "queryLogs" => HandleQueryLogs(message),
                _ => ErrorJson(message.Id, "UNKNOWN_COMMAND", $"未知命令: {message.Command}")
            };
        }
        catch (Exception ex)
        {
            result = ErrorJson(message.Id, "INTERNAL_ERROR", ex.Message);
        }

        await SendResponse(ws, result);
    }

    private string HandlePrint(WebSocketMessage message)
    {
        var request = BuildPrintRequest(message);
        if (request == null)
            return ErrorJson(message.Id, "INVALID_PARAMS", "缺少打印参数");

        var result = _api.HandleCommand(new PrinterCommand
        {
            Command = "print",
            Id = message.Id,
            Params = ConvertToDictionary(message.Params)
        });
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private string HandlePrintAsync(WebSocketMessage message)
    {
        var request = BuildPrintRequest(message);
        if (request == null)
            return ErrorJson(message.Id, "INVALID_PARAMS", "缺少打印参数");

        var result = _api.HandleCommand(new PrinterCommand
        {
            Command = "printAsync",
            Id = message.Id,
            Params = ConvertToDictionary(message.Params)
        });
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private string HandleGetPrinterStatus(WebSocketMessage message)
    {
        var printerName = message.Params?["printerName"]?.ToString();
        if (string.IsNullOrEmpty(printerName))
            return ErrorJson(message.Id, "INVALID_PARAMS", "缺少printerName参数");

        return _api.GetPrinterStatus(printerName);
    }

    private string HandleGetJobStatus(WebSocketMessage message)
    {
        var jobId = message.Params?["jobId"]?.ToString();
        if (string.IsNullOrEmpty(jobId))
            return ErrorJson(message.Id, "INVALID_PARAMS", "缺少jobId参数");

        return _api.GetJobStatus(jobId);
    }

    private string HandleQueryLogs(WebSocketMessage message)
    {
        var result = _api.HandleCommand(new PrinterCommand
        {
            Command = "queryLogs",
            Id = message.Id,
            Params = ConvertToDictionary(message.Params)
        });
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private static Dictionary<string, object> ConvertToDictionary(JObject obj)
    {
        if (obj == null)
            return null;

        var dict = new Dictionary<string, object>();
        foreach (var prop in obj.Properties())
        {
            dict[prop.Name] = prop.Value.ToObject<object>();
        }
        return dict;
    }

    private PrintRequestParams BuildPrintRequest(WebSocketMessage message)
    {
        if (message.Params == null)
            return null;

        var request = message.Params.ToObject<PrintRequestParams>();

        // 如果有二进制 PDF 数据，设置到 request
        if (message.PdfBytes != null && message.PdfBytes.Length > 0)
            request.PdfBytes = message.PdfBytes;

        return request;
    }

    private async Task SendResponse(WebSocket ws, string result)
    {
        if (ws.State != WebSocketState.Open)
            return;

        var bytes = Encoding.UTF8.GetBytes(result);
        var segment = new ArraySegment<byte>(bytes);
        await ws.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private static string ErrorJson(string id, string code, string message)
    {
        return JsonConvert.SerializeObject(new
        {
            id,
            success = false,
            errorInfo = new { code, message }
        }, JsonSettings);
    }
}
