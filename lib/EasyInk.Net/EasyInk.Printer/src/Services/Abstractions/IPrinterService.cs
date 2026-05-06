using System.Collections.Generic;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services.Abstractions;

public interface IPrinterService
{
    List<PrinterInfo> GetPrinters();
    PrinterStatus GetPrinterStatus(string printerName);
}
