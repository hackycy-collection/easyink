using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using EasyInk.Printer;

namespace EasyInk.Printer.Api;

public class PrintController
{
    private readonly EngineApi _api;

    public PrintController(EngineApi api)
    {
        _api = api;
    }

    public PrinterResult Print(string body)
    {
        return ExecuteCommand("print", body);
    }

    public PrinterResult Print(string body, byte[]? pdfBytes)
    {
        return ExecuteCommandWithBlob("print", body, pdfBytes);
    }

    public PrinterResult EnqueuePrint(string body)
    {
        return ExecuteCommand("printAsync", body);
    }

    public PrinterResult EnqueuePrint(string body, byte[]? pdfBytes)
    {
        return ExecuteCommandWithBlob("printAsync", body, pdfBytes);
    }

    public PrinterResult BatchPrint(string body)
    {
        return ExecuteBatchCommand("batchPrint", body);
    }

    public PrinterResult EnqueueBatchPrint(string body)
    {
        return ExecuteBatchCommand("batchPrintAsync", body);
    }

    private PrinterResult ExecuteCommand(string command, string body)
    {
        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = ParseBodyToDictionary(body)
        };
        return _api.HandleCommand(cmd);
    }

    private PrinterResult ExecuteCommandWithBlob(string command, string body, byte[]? pdfBytes)
    {
        var parms = ParseBodyToDictionary(body) ?? new Dictionary<string, object>();
        if (pdfBytes != null)
            parms["pdfBytes"] = pdfBytes;

        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = parms
        };
        return _api.HandleCommand(cmd);
    }

    private PrinterResult ExecuteBatchCommand(string command, string body)
    {
        if (string.IsNullOrEmpty(body))
            return PrinterResult.Error(Guid.NewGuid().ToString(), ErrorCode.InvalidParams, LangManager.Get("Api_MissingBody"));

        var token = JToken.Parse(body);
        JArray jobs;
        if (token is JArray arr)
            jobs = arr;
        else if (token is JObject obj && obj["jobs"] is JArray jArr)
            jobs = jArr;
        else
            return PrinterResult.Error(Guid.NewGuid().ToString(), ErrorCode.InvalidParams, LangManager.Get("Api_JobsMustBeArray"));

        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = new Dictionary<string, object> { ["jobs"] = jobs }
        };
        return _api.HandleCommand(cmd);
    }

    private static Dictionary<string, object>? ParseBodyToDictionary(string body)
    {
        if (string.IsNullOrEmpty(body))
            return null;
        var token = JToken.Parse(body);
        if (token is JObject obj)
        {
            var dict = new Dictionary<string, object>();
            foreach (var prop in obj.Properties())
                dict[prop.Name] = prop.Value;
            return dict;
        }
        return null;
    }
}
