using System.Collections.Generic;
using EasyInk.Engine;
using EasyInk.Engine.Models;
using Newtonsoft.Json;

namespace EasyInk.Printer.Api;

public class JobController
{
    private readonly EngineApi _api;

    private static readonly JsonSerializerSettings JsonSettings = JsonConfig.CamelCase;

    public JobController(EngineApi api)
    {
        _api = api;
    }

    public string GetJobStatus(string jobId)
    {
        var result = _api.HandleCommand(new PrinterCommand
        {
            Command = "getJobStatus",
            Id = jobId,
            Params = new Dictionary<string, object> { ["jobId"] = jobId }
        });
        return JsonConvert.SerializeObject(result, JsonSettings);
    }

    public string GetAllJobs()
    {
        return _api.GetAllJobs();
    }
}
