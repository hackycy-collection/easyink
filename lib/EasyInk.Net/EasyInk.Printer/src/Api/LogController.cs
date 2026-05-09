using System;
using System.Collections.Specialized;
using EasyInk.Engine;
using EasyInk.Printer.Services.Abstractions;
using Newtonsoft.Json;

namespace EasyInk.Printer.Api;

public class LogController
{
    private readonly IAuditService _auditService;

    public LogController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    public string QueryLogs(NameValueCollection query)
    {
        DateTime? startTime = ParseDateTime(query["startTime"]);
        DateTime? endTime = ParseDateTime(query["endTime"]);
        string printerName = query["printerName"];
        string userId = query["userId"];
        string status = query["status"];
        int limit = int.TryParse(query["limit"], out var l) ? l : 100;
        int offset = int.TryParse(query["offset"], out var o) ? o : 0;

        var logs = _auditService.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
        return JsonConvert.SerializeObject(new { success = true, data = new { logs } }, JsonConfig.CamelCase);
    }

    private static DateTime? ParseDateTime(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (DateTime.TryParse(value, out var dt)) return dt;
        return null;
    }
}
