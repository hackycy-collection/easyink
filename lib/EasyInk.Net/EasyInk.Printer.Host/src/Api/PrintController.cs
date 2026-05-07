using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;
using EasyInk.Printer;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Host.Api;

public class PrintController
{
    private readonly PrinterApi _api;

    private static readonly JsonSerializerSettings JsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver()
    };

    public PrintController(PrinterApi api)
    {
        _api = api;
    }

    public string Print(string body)
    {
        return ExecuteCommand("print", body);
    }

    public string Print(string body, byte[] pdfBytes)
    {
        return ExecuteCommandWithBlob("print", body, pdfBytes);
    }

    public string PrintAsync(string body)
    {
        return ExecuteCommand("printAsync", body);
    }

    public string PrintAsync(string body, byte[] pdfBytes)
    {
        return ExecuteCommandWithBlob("printAsync", body, pdfBytes);
    }

    public string BatchPrint(string body)
    {
        return ExecuteBatchCommand("batchPrint", body);
    }

    public string BatchPrintAsync(string body)
    {
        return ExecuteBatchCommand("batchPrintAsync", body);
    }

    private string ExecuteCommand(string command, string body)
    {
        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = ParseBodyToDictionary(body)
        };
        var result = _api.HandleCommand(cmd);
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private string ExecuteCommandWithBlob(string command, string body, byte[] pdfBytes)
    {
        var parms = ParseBodyToDictionary(body) ?? new Dictionary<string, object>();
        if (pdfBytes != null)
            parms["pdfBytes"] = Convert.ToBase64String(pdfBytes);

        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = parms
        };
        var result = _api.HandleCommand(cmd);
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private string ExecuteBatchCommand(string command, string body)
    {
        if (string.IsNullOrEmpty(body))
        {
            return JsonConvert.SerializeObject(PrinterResult.Error(
                Guid.NewGuid().ToString(), "INVALID_PARAMS", "缺少请求体"), JsonSettings);
        }

        var token = JToken.Parse(body);
        JArray jobs;
        if (token is JArray arr)
            jobs = arr;
        else if (token is JObject obj && obj["jobs"] is JArray jArr)
            jobs = jArr;
        else
        {
            return JsonConvert.SerializeObject(PrinterResult.Error(
                Guid.NewGuid().ToString(), "INVALID_PARAMS", "jobs 必须是数组"), JsonSettings);
        }

        var cmd = new PrinterCommand
        {
            Command = command,
            Id = Guid.NewGuid().ToString(),
            Params = new Dictionary<string, object> { ["jobs"] = jobs }
        };
        var result = _api.HandleCommand(cmd);
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    private static Dictionary<string, object> ParseBodyToDictionary(string body)
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
