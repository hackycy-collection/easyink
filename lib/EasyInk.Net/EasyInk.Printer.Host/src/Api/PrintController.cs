using System;
using EasyInk.Printer.Host.Plugin;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EasyInk.Printer.Host.Api;

public class PrintController
{
    private readonly PluginBridge _plugin;

    public PrintController(PluginBridge plugin)
    {
        _plugin = plugin;
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

    /// <summary>
    /// 单个打印命令：body 直接作为 params.params 传入
    /// </summary>
    private string ExecuteCommand(string command, string body)
    {
        var commandObj = new JObject
        {
            ["command"] = command,
            ["id"] = Guid.NewGuid().ToString(),
            ["params"] = new JObject { ["params"] = ParseBody(body) }
        };
        return _plugin.HandleCommand(commandObj.ToString(Formatting.None));
    }

    /// <summary>
    /// 批量打印命令：body 中的 jobs 数组作为 params.jobs 传入
    /// </summary>
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
        return _plugin.HandleCommand(commandObj.ToString(Formatting.None));
    }

    private static JToken ParseBody(string body)
    {
        if (string.IsNullOrEmpty(body))
            return new JObject();
        return JToken.Parse(body);
    }
}
