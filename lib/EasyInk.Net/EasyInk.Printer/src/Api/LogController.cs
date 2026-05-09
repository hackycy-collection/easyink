using System;
using System.Collections.Specialized;
using EasyInk.Printer.Services;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace EasyInk.Printer.Api;

public class LogController
{
    private readonly AuditService _auditService;

    private static readonly JsonSerializerSettings JsonSettings = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver()
    };

    public LogController(AuditService auditService)
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
        return JsonConvert.SerializeObject(new { success = true, data = new { logs } }, JsonSettings);
    }

    private static DateTime? ParseDateTime(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (DateTime.TryParse(value, out var dt)) return dt;
        return null;
    }
}
