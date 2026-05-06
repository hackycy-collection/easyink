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
        return ExecuteCommand("batchPrint", body);
    }

    public string BatchPrintAsync(string body)
    {
        return ExecuteCommand("batchPrintAsync", body);
    }

    private string ExecuteCommand(string command, string body)
    {
        var commandObj = new JObject
        {
            ["command"] = command,
            ["id"] = Guid.NewGuid().ToString()
        };

        if (!string.IsNullOrEmpty(body))
        {
            var bodyToken = JToken.Parse(body);
            if (bodyToken is JObject jObj)
            {
                // batchPrint 需要 jobs 数组
                if (command.StartsWith("batch"))
                {
                    commandObj["params"] = new JObject { ["jobs"] = jObj["jobs"] ?? bodyToken };
                }
                else
                {
                    commandObj["params"] = new JObject { ["params"] = jObj };
                }
            }
            else if (bodyToken is JArray jArr)
            {
                commandObj["params"] = new JObject { ["jobs"] = jArr };
            }
        }
        else
        {
            commandObj["params"] = new JObject();
        }

        return _plugin.HandleCommand(commandObj.ToString(Formatting.None));
    }
}
