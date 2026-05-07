namespace EasyInk.Printer.Host.Api;

public class PrinterController
{
    private readonly PrinterApi _api;

    public PrinterController(PrinterApi api)
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
