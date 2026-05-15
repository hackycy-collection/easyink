using System;
using System.Collections.Generic;
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
    private readonly HashSet<string> _rawPrinters;

    public RoutingPrintService(IPrintService gdiService, IPrintService rawService, IEnumerable<string> rawPrinterNames)
    {
        _gdiService = gdiService ?? throw new ArgumentNullException(nameof(gdiService));
        _rawService = rawService ?? throw new ArgumentNullException(nameof(rawService));
        _rawPrinters = new HashSet<string>(rawPrinterNames ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
    }

    public PrinterResult Print(string requestId, PrintRequestParams request, CancellationToken cancellationToken = default)
    {
        return SelectService(request.PrinterName).Print(requestId, request, cancellationToken);
    }

    private IPrintService SelectService(string printerName)
    {
        return _rawPrinters.Contains(printerName) ? _rawService : _gdiService;
    }
}
