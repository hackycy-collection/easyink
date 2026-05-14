using System;
using System.Diagnostics;
using EasyInk.Engine.Models;
using EasyInk.Printer.Utils;

namespace EasyInk.Printer.Api;

public class StatusController
{
    private static readonly DateTime StartTime = Process.GetCurrentProcess().StartTime;

    public PrinterResult GetStatus()
    {
        using (var process = Process.GetCurrentProcess())
        {
            return PrinterResult.Ok("status", new
            {
                status = "running",
                version = VersionHelper.GetDisplayVersion(typeof(StatusController).Assembly),
                startTime = StartTime,
                uptime = (DateTime.Now - StartTime).ToString(@"d\.hh\:mm\:ss"),
                memoryMb = process.WorkingSet64 / 1024 / 1024
            });
        }
    }
}
