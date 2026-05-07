using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Api;

public class JobController
{
    private readonly PrinterApi _api;

    public JobController(PrinterApi api)
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
