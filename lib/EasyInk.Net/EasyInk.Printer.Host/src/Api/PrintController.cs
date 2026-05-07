using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EasyInk.Printer.Host.Api;

public class PrintController
{
    private readonly PrinterApi _api;

    public PrintController(PrinterApi api)
    {
        _api = api;
    }

    public string Print(string body)
    {
        return ExecuteCommand("print", body);
    }

    public string PrintAsync(string body)
    {
        return ExecuteCommand("printAsync", body);
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
        var commandObj = new JObject
        {
            ["command"] = command,
            ["id"] = Guid.NewGuid().ToString(),
            ["params"] = new JObject { ["params"] = ParseBody(body) }
        };
        return _api.HandleCommand(commandObj.ToString(Formatting.None));
    }

    private string ExecuteBatchCommand(string command, string body)
    {
        JArray jobs;
        if (string.IsNullOrEmpty(body))
        {
            return JsonConvert.SerializeObject(new
            {
                success = false,
                errorInfo = new { code = "INVALID_PARAMS", message = "缺少请求体" }
            });
        }

        var token = JToken.Parse(body);
        if (token is JArray arr)
        {
            jobs = arr;
        }
        else if (token is JObject obj && obj["jobs"] is JArray jArr)
        {
            jobs = jArr;
        }
        else
        {
            return JsonConvert.SerializeObject(new
            {
                success = false,
                errorInfo = new { code = "INVALID_PARAMS", message = "jobs 必须是数组" }
            });
        }

        var commandObj = new JObject
        {
            ["command"] = command,
            ["id"] = Guid.NewGuid().ToString(),
            ["params"] = new JObject { ["jobs"] = jobs }
        };
        return _api.HandleCommand(commandObj.ToString(Formatting.None));
    }

    private static JToken ParseBody(string body)
    {
        if (string.IsNullOrEmpty(body))
            return new JObject();
        return JToken.Parse(body);
    }
}
