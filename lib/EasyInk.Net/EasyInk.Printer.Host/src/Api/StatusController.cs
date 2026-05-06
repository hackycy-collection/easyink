using System;
using System.Diagnostics;
using Newtonsoft.Json;

namespace EasyInk.Printer.Host.Api;

public class StatusController
{
    private static readonly DateTime StartTime = Process.GetCurrentProcess().StartTime;

    public string GetStatus()
    {
        var process = Process.GetCurrentProcess();
        return JsonConvert.SerializeObject(new
        {
            success = true,
            data = new
            {
                status = "running",
                version = typeof(StatusController).Assembly.GetName().Version?.ToString() ?? "1.0.0",
                startTime = StartTime,
                uptime = (DateTime.Now - StartTime).ToString(@"d\.hh\:mm\:ss"),
                memoryMb = process.WorkingSet64 / 1024 / 1024
            }
        });
    }
}
