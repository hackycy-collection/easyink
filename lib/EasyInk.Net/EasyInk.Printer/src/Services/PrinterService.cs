using System.Diagnostics;
using System.Drawing.Printing;
using System.Management;
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
    /// 获取打印机状态（通过 WMI 查询真实状态）
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

            return QueryWmiStatus(printerName);
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

    private PrinterStatus QueryWmiStatus(string printerName)
    {
        var escapedName = printerName.Replace("\\", "\\\\").Replace("'", "\\'");
        using (var searcher = new ManagementObjectSearcher(
            $"SELECT * FROM Win32_Printer WHERE Name = '{escapedName}'"))
        {
            foreach (ManagementObject printer in searcher.Get())
            {
                using (printer)
                {
                    // PrinterStatus: 1=Other, 2=Unknown, 3=Idle, 4=Printing, 5=Warmup, 6=Stopped, 7=Offline
                    var printerStatus = GetUInt32(printer, "PrinterStatus");
                    // PrinterState: 0=Idle, 1=Printing, 2=Warmup, 3=Stopped, 4=Offline,
                    //               5=Error(ready), 6=Busy, 7=Not_Available, 8=Waiting,
                    //               9=Processing, 10=Initialization, 11=Power_Save, 12=Pending_Deletion, 13=Paper_Jam
                    var printerState = GetUInt32(printer, "PrinterState");
                    var isOffline = GetBool(printer, "WorkOffline");
                    var paperOut = GetBool(printer, "PrinterPaperOutOfPaper");
                    var paperJam = printerState == 13;

                    var isReady = !isOffline && printerStatus == 3;

                    string statusCode;
                    string message;
                    string stateDesc;

                    if (isOffline)
                    {
                        statusCode = "PRINTER_OFFLINE";
                        message = "打印机离线";
                        stateDesc = "Offline";
                    }
                    else if (paperJam)
                    {
                        statusCode = "PAPER_JAM";
                        message = "打印机卡纸";
                        stateDesc = "PaperJam";
                    }
                    else if (paperOut)
                    {
                        statusCode = "PAPER_OUT";
                        message = "打印机缺纸";
                        stateDesc = "PaperOut";
                    }
                    else if (printerStatus == 6)
                    {
                        statusCode = "PRINTER_STOPPED";
                        message = "打印机已停止";
                        stateDesc = "Stopped";
                    }
                    else if (printerStatus == 3 || printerStatus == 4)
                    {
                        statusCode = "READY";
                        message = printerStatus == 4 ? "打印中" : "打印机就绪";
                        stateDesc = printerStatus == 4 ? "Printing" : "Idle";
                    }
                    else
                    {
                        statusCode = "PRINTER_ERROR";
                        message = $"打印机异常状态 (PrinterStatus={printerStatus}, PrinterState={printerState})";
                        stateDesc = $"Unknown({printerStatus})";
                    }

                    return new PrinterStatus
                    {
                        IsReady = isReady,
                        StatusCode = statusCode,
                        Message = message,
                        IsOnline = !isOffline,
                        HasPaper = !paperOut,
                        IsPaperJam = paperJam,
                        PrinterState = stateDesc
                    };
                }
            }
        }

        // WMI 查询无结果，回退到 PrinterSettings 验证
        return new PrinterStatus
        {
            IsReady = true,
            StatusCode = "READY",
            Message = "打印机就绪（状态详情不可用）",
            IsOnline = true,
            HasPaper = true,
            IsPaperJam = false,
            PrinterState = "Unknown"
        };
    }

    private static uint GetUInt32(ManagementObject obj, string property)
    {
        var val = obj[property];
        return val != null ? (uint)val : 0u;
    }

    private static bool GetBool(ManagementObject obj, string property)
    {
        var val = obj[property];
        return val != null && (bool)val;
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
        catch (Exception ex)
        {
            Debug.WriteLine($"[EasyInk.Printer] 获取打印机 {printerName} 纸张尺寸失败: {ex.Message}");
        }

        return sizes;
    }
}
