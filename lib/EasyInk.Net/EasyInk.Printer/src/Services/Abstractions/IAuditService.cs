using System;
using System.Collections.Generic;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services.Abstractions;

public interface IAuditService
{
    void LogPrint(PrintAuditLog log);
    List<PrintAuditLog> QueryLogs(
        DateTime? startTime = null,
        DateTime? endTime = null,
        string printerName = null,
        string userId = null,
        string status = null,
        int limit = 100,
        int offset = 0);
}
