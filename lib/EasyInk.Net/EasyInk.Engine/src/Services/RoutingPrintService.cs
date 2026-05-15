using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services;

/// <summary>
/// 打印路由服务：根据打印机名称判断走哪种打印路径。
/// 热敏打印机 → Raw ESC/POS；普通打印机 → PrintDocument (GDI)。
/// </summary>
public class RoutingPrintService : IPrintService
{
    private readonly IPrintService _gdiService;
    private readonly IPrintService _rawService;
    private readonly List<string> _rawPrinterPatterns;

    public RoutingPrintService(IPrintService gdiService, IPrintService rawService, IEnumerable<string> rawPrinterNames)
    {
        _gdiService = gdiService ?? throw new ArgumentNullException(nameof(gdiService));
        _rawService = rawService ?? throw new ArgumentNullException(nameof(rawService));
        _rawPrinterPatterns = (rawPrinterNames ?? Array.Empty<string>())
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();
    }

    public PrinterResult Print(string requestId, PrintRequestParams request, CancellationToken cancellationToken = default)
    {
        return SelectService(request.PrinterName).Print(requestId, request, cancellationToken);
    }

    private IPrintService SelectService(string printerName)
    {
        if (string.IsNullOrEmpty(printerName))
            return _gdiService;
        return _rawPrinterPatterns.Any(p => printerName.IndexOf(p, StringComparison.OrdinalIgnoreCase) >= 0)
            ? _rawService
            : _gdiService;
    }
}
