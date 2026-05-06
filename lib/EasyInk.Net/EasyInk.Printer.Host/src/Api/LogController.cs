using System;
using System.Collections.Specialized;

namespace EasyInk.Printer.Host.Api;

public class LogController
{
    private readonly PrinterApi _api;

    public LogController(PrinterApi api)
    {
        _api = api;
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

        return _api.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
    }

    private static DateTime? ParseDateTime(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (DateTime.TryParse(value, out var dt)) return dt;
        return null;
    }
}
