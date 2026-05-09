using EasyInk.Engine;

namespace EasyInk.Printer.Api;

public class PrinterController
{
    private readonly EngineApi _api;

    public PrinterController(EngineApi api)
    {
        _api = api;
    }

    public string GetPrinters()
    {
        return _api.GetPrinters();
    }

    public string GetPrinterStatus(string printerName)
    {
        return _api.GetPrinterStatus(printerName);
    }
}
