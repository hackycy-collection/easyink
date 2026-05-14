using System;
using System.Collections.Specialized;
using EasyInk.Engine.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Api;

public class LogController
{
    private readonly IAuditService _auditService;

    public LogController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    public PrinterResult QueryLogs(NameValueCollection query)
    {
        DateTime? startTime = ParseDateTime(query["startTime"]);
        DateTime? endTime = ParseDateTime(query["endTime"]);
        string printerName = query["printerName"];
        string userId = query["userId"];
        string status = query["status"];
        int limit = int.TryParse(query["limit"], out var l) ? l : 100;
        int offset = int.TryParse(query["offset"], out var o) ? o : 0;

        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return PrinterResult.Ok("logs", new { logs });
    }

    private static DateTime? ParseDateTime(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (DateTime.TryParse(value, out var dt)) return dt;
        return null;
    }
}
