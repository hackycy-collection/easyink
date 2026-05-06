using EasyInk.Printer.Host.Plugin;

namespace EasyInk.Printer.Host.Api;

public class PrinterController
{
    private readonly PluginBridge _plugin;

    public PrinterController(PluginBridge plugin)
    {
        _plugin = plugin;
    }

    public string GetPrinters()
    {
        return _plugin.GetPrinters();
    }

    public string GetPrinterStatus(string printerName)
    {
        return _plugin.GetPrinterStatus(printerName);
    }
}
