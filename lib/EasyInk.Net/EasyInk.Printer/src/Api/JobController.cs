using EasyInk.Engine;
using Newtonsoft.Json;

namespace EasyInk.Printer.Api;

public class JobController
{
    private readonly EngineApi _api;

    public JobController(EngineApi api)
    {
        _api = api;
    }

    public string GetJobStatus(string jobId)
    {
        return _api.HandleCommand(JsonConvert.SerializeObject(new
        {
            command = "getJobStatus",
            id = jobId,
            @params = new { jobId }
        }));
    }

    public string GetAllJobs()
    {
        return _api.GetAllJobs();
    }
}
