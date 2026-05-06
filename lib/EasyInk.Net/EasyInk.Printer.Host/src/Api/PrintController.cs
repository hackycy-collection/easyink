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
        return _plugin.HandleCommand(BuildCommand("print", body));
    }

    public string PrintAsync(string body)
    {
        return _plugin.HandleCommand(BuildCommand("printAsync", body));
    }

    public string BatchPrint(string body)
    {
        return _plugin.HandleCommand(BuildCommand("batchPrint", body));
    }

    public string BatchPrintAsync(string body)
    {
        return _plugin.HandleCommand(BuildCommand("batchPrintAsync", body));
    }

    private static string BuildCommand(string command, string body)
    {
        var jObj = new JObject
        {
            ["command"] = command,
            ["id"] = System.Guid.NewGuid().ToString(),
            ["params"] = string.IsNullOrEmpty(body) ? new JObject() : JObject.Parse(body)
        };
        return jObj.ToString(Formatting.None);
    }
}
