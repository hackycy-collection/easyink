using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services.Abstractions;

public interface IPrintService
{
    PrinterResult Print(string requestId, PrintRequestParams request);
}
