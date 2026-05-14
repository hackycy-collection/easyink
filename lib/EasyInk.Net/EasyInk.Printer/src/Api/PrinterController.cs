using EasyInk.Engine;
using EasyInk.Engine.Models;

namespace EasyInk.Printer.Api;

public class PrinterController
{
    private readonly EngineApi _api;

    public PrinterController(EngineApi api)
    {
        _api = api;
    }

    public PrinterResult GetPrinters()
    {
        return _api.GetPrinters();
    }

    public PrinterResult GetPrinterStatus(string printerName)
    {
        return _api.GetPrinterStatus(printerName);
    }
}
