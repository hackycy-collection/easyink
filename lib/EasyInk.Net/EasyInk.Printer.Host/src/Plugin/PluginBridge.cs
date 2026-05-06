using System;
using EasyInk.Printer;

namespace EasyInk.Printer.Host.Plugin;

/// <summary>
/// DLL 插件包装层
/// 封装 PrinterApi，供 Server 层调用
/// </summary>
public class PluginBridge : IDisposable
{
    private readonly PrinterApi _api;

    public PluginBridge(string dbPath = null)
    {
        _api = new PrinterApi(dbPath);
    }

    public string HandleCommand(string json)
    {
        return _api.HandleCommand(json);
    }

    public string GetPrinters()
    {
        return _api.GetPrinters();
    }

    public string GetPrinterStatus(string printerName)
    {
        return _api.GetPrinterStatus(printerName);
    }

    public string Print(string printerName, string pdfBase64, int copies = 1,
        double? paperWidth = null, double? paperHeight = null, string paperUnit = "mm",
        int dpi = 300, double? offsetX = null, double? offsetY = null, string offsetUnit = "mm",
        string userId = null, string labelType = null)
    {
        return _api.Print(printerName, pdfBase64, copies,
            paperWidth, paperHeight, paperUnit, dpi,
            offsetX, offsetY, offsetUnit, userId, labelType);
    }

    public string QueryLogs(DateTime? startTime = null, DateTime? endTime = null,
        string printerName = null, string userId = null, string status = null,
        int limit = 100, int offset = 0)
    {
        return _api.QueryLogs(startTime, endTime, printerName, userId, status, limit, offset);
    }

    public void Dispose()
    {
        _api.Dispose();
    }
}
