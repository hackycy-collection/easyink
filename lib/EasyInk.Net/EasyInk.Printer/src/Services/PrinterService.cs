using System.Drawing.Printing;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services;

/// <summary>
/// 打印机管理服务
/// </summary>
public class PrinterService
{
    /// <summary>
    /// 获取所有打印机
    /// </summary>
    public List<PrinterInfo> GetPrinters()
    {
        var printers = new List<PrinterInfo>();

        foreach (string printerName in PrinterSettings.InstalledPrinters)
        {
            var settings = new PrinterSettings { PrinterName = printerName };
            printers.Add(new PrinterInfo
            {
                Name = printerName,
                IsDefault = settings.IsDefaultPrinter,
                Status = GetPrinterStatus(printerName),
                SupportedPaperSizes = GetSupportedPaperSizes(printerName)
            });
        }

        return printers;
    }

    /// <summary>
    /// 获取打印机状态
    /// </summary>
    public PrinterStatus GetPrinterStatus(string printerName)
    {
        try
        {
            var settings = new PrinterSettings { PrinterName = printerName };

            if (!settings.IsValid)
            {
                return new PrinterStatus
                {
                    IsReady = false,
                    StatusCode = "PRINTER_NOT_FOUND",
                    Message = "打印机不存在或无法访问",
                    IsOnline = false,
                    HasPaper = false,
                    IsPaperJam = false
                };
            }

            // TODO: 使用 Windows API 获取更详细的状态
            return new PrinterStatus
            {
                IsReady = true,
                StatusCode = "READY",
                Message = "打印机就绪",
                IsOnline = true,
                HasPaper = true,
                IsPaperJam = false
            };
        }
        catch (Exception ex)
        {
            return new PrinterStatus
            {
                IsReady = false,
                StatusCode = "PRINTER_ERROR",
                Message = ex.Message,
                IsOnline = false,
                HasPaper = false,
                IsPaperJam = false
            };
        }
    }

    private List<PaperSizeInfo> GetSupportedPaperSizes(string printerName)
    {
        var sizes = new List<PaperSizeInfo>();

        try
        {
            var settings = new PrinterSettings { PrinterName = printerName };
            foreach (PaperSize size in settings.PaperSizes)
            {
                sizes.Add(new PaperSizeInfo
                {
                    Name = size.PaperName,
                    Width = size.Width,
                    Height = size.Height
                });
            }
        }
        catch
        {
            // 忽略错误
        }

        return sizes;
    }
}
