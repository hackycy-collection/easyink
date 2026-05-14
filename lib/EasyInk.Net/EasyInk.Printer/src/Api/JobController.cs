using System.Collections.Generic;
using EasyInk.Engine;
using EasyInk.Engine.Models;

namespace EasyInk.Printer.Api;

public class JobController
{
    private readonly EngineApi _api;

    public JobController(EngineApi api)
    {
        _api = api;
    }

    public PrinterResult GetJobStatus(string jobId)
    {
        return _api.HandleCommand(new PrinterCommand
        {
            Command = "getJobStatus",
            Id = jobId,
            Params = new Dictionary<string, object> { ["jobId"] = jobId }
        });
    }

    public PrinterResult GetAllJobs()
    {
        return _api.GetAllJobs();
    }
}
