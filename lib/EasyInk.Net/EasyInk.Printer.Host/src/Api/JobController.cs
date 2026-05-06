using EasyInk.Printer.Host.Plugin;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Api;

public class JobController
{
    private readonly PluginBridge _plugin;

    public JobController(PluginBridge plugin)
    {
        _plugin = plugin;
    }

    public string GetJobStatus(string jobId)
    {
        return _plugin.HandleCommand(JsonConvert.SerializeObject(new
        {
            command = "getJobStatus",
            id = jobId,
            @params = new { jobId }
        }));
    }

    public string GetAllJobs()
    {
        // PrinterApi 暴露的是 getJobStatus，全量查询需要扩展
        // TODO: 后续在 DLL 插件中增加 getAllJobs 命令
        return JsonConvert.SerializeObject(new { success = true, data = new object[0] });
    }
}
