using System;
using System.Collections.Generic;
using System.Drawing.Printing;
using System.Management;
using System.Threading.Tasks;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;

namespace EasyInk.Engine.Services;

/// <summary>
/// 打印机服务，通过 WMI 查询打印机状态
/// </summary>
public class PrinterService : IPrinterService
{
    private const int WmiTimeoutMs = 5_000;
    /// <summary>
    /// 获取所有打印机
    /// </summary>
    public List<PrinterInfo> GetPrinters()
    {
        var wmiStatusMap = QueryAllWmiStatus();
        var printers = new List<PrinterInfo>();

        foreach (string printerName in PrinterSettings.InstalledPrinters)
        {
            var settings = new PrinterSettings { PrinterName = printerName };
            var status = wmiStatusMap.TryGetValue(printerName, out var s)
                ? s
                : GetPrinterStatus(printerName);
            printers.Add(new PrinterInfo
            {
                Name = printerName,
                IsDefault = settings.IsDefaultPrinter,
                Status = status,
                SupportedPaperSizes = GetSupportedPaperSizes(printerName)
            });
        }

        return printers;
    }

    private Dictionary<string, PrinterStatus> QueryAllWmiStatus()
    {
        var map = new Dictionary<string, PrinterStatus>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var task = Task.Run(() =>
            {
                using (var searcher = new ManagementObjectSearcher("SELECT Name, PrinterStatus, PrinterState, WorkOffline, PrinterPaperOutOfPaper FROM Win32_Printer"))
                {
                    foreach (ManagementObject printer in searcher.Get())
                    {
                        try
                        {
                            var name = printer["Name"] as string;
                            if (string.IsNullOrEmpty(name)) continue;

                            var printerStatus = GetUInt32(printer, "PrinterStatus");
                            var printerState = GetUInt32(printer, "PrinterState");
                            var isOffline = GetBool(printer, "WorkOffline");
                            var paperOut = GetBool(printer, "PrinterPaperOutOfPaper");

                            map[name] = MapPrinterStatus(printerStatus, printerState, isOffline, paperOut);
                        }
                        finally
                        {
                            printer.Dispose();
                        }
                    }
                }
            });

            if (!task.Wait(WmiTimeoutMs))
            {
                EasyInk.Engine.EngineApi.RaiseLog(LogLevel.Error, $"批量查询打印机状态超时({WmiTimeoutMs}ms)");
            }
        }
        catch (AggregateException ex) when (ex.InnerException is TimeoutException)
        {
            EasyInk.Engine.EngineApi.RaiseLog(LogLevel.Error, $"批量查询打印机状态超时");
        }
        catch (Exception ex)
        {
            EasyInk.Engine.EngineApi.RaiseLog(LogLevel.Error, $"批量查询打印机状态失败: {ex.Message}");
        }
        return map;
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
                    StatusCode = PrinterStatusCode.PrinterNotFound,
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
                StatusCode = PrinterStatusCode.PrinterError,
                Message = ex.Message,
                IsOnline = false,
                HasPaper = false,
                IsPaperJam = false
            };
        }
    }

    private PrinterStatus QueryWmiStatus(string printerName)
    {
        var isValidPrinter = false;
        foreach (string installed in PrinterSettings.InstalledPrinters)
        {
            if (string.Equals(installed, printerName, StringComparison.OrdinalIgnoreCase))
            {
                isValidPrinter = true;
                break;
            }
        }
        if (!isValidPrinter)
        {
            return new PrinterStatus
            {
                IsReady = false,
                StatusCode = PrinterStatusCode.PrinterNotFound,
                Message = "打印机不存在或无法访问",
                IsOnline = false,
                HasPaper = false,
                IsPaperJam = false
            };
        }

        PrinterStatus QueryWmi()
        {
            // 通过对象路径精确获取，避免 WQL 字符串拼接注入风险
            var wmiEscapedName = printerName.Replace("\\", "\\\\").Replace("'", "\\'");
            var printerPath = new ManagementPath($"Win32_Printer.Name='{wmiEscapedName}'");
            ManagementObject printer = null;
            try
            {
                printer = new ManagementObject(printerPath);
                try
                {
                    printer.Get();
                }
                catch (ManagementException)
                {
                    return new PrinterStatus
                    {
                        IsReady = true,
                        StatusCode = PrinterStatusCode.Ready,
                        Message = "打印机就绪（WMI 状态不可用）",
                        IsOnline = true,
                        HasPaper = true,
                        IsPaperJam = false,
                        PrinterState = "Unknown"
                    };
                }

                var printerStatus = GetUInt32(printer, "PrinterStatus");
                var printerState = GetUInt32(printer, "PrinterState");
                var isOffline = GetBool(printer, "WorkOffline");
                var paperOut = GetBool(printer, "PrinterPaperOutOfPaper");

                return MapPrinterStatus(printerStatus, printerState, isOffline, paperOut);
            }
            finally
            {
                printer?.Dispose();
            }
        }

        try
        {
            var task = Task.Run(() => QueryWmi());
            if (task.Wait(WmiTimeoutMs))
                return task.Result;

            EasyInk.Engine.EngineApi.RaiseLog(LogLevel.Error, $"查询打印机 {printerName} WMI 状态超时({WmiTimeoutMs}ms)");
            return new PrinterStatus
            {
                IsReady = false,
                StatusCode = PrinterStatusCode.PrinterError,
                Message = $"WMI 查询超时({WmiTimeoutMs}ms)",
                IsOnline = false,
                HasPaper = false,
                IsPaperJam = false
            };
        }
        catch (AggregateException ex)
        {
            var inner = ex.InnerException;
            if (inner is ManagementException)
            {
                return new PrinterStatus
                {
                    IsReady = true,
                    StatusCode = PrinterStatusCode.Ready,
                    Message = "打印机就绪（WMI 状态不可用）",
                    IsOnline = true,
                    HasPaper = true,
                    IsPaperJam = false,
                    PrinterState = "Unknown"
                };
            }
            return new PrinterStatus
            {
                IsReady = false,
                StatusCode = PrinterStatusCode.PrinterError,
                Message = inner?.Message ?? ex.Message,
                IsOnline = false,
                HasPaper = false,
                IsPaperJam = false
            };
        }
    }

    // PrinterStatus: 1=Other, 2=Unknown, 3=Idle, 4=Printing, 5=Warmup, 6=Stopped, 7=Offline
    // PrinterState: 0=Idle, 1=Printing, 2=Warmup, 3=Stopped, 4=Offline,
    //               5=Error(ready), 6=Busy, 7=Not_Available, 8=Waiting,
    //               9=Processing, 10=Initialization, 11=Power_Save, 12=Pending_Deletion, 13=Paper_Jam
    private static PrinterStatus MapPrinterStatus(uint printerStatus, uint printerState, bool isOffline, bool paperOut)
    {
        var paperJam = printerState == 13;
        var isReady = !isOffline && printerStatus == 3;

        string statusCode;
        string message;
        string stateDesc;

        if (isOffline)
        {
            statusCode = PrinterStatusCode.PrinterOffline;
            message = "打印机离线";
            stateDesc = "Offline";
        }
        else if (paperJam)
        {
            statusCode = PrinterStatusCode.PaperJam;
            message = "打印机卡纸";
            stateDesc = "PaperJam";
        }
        else if (paperOut)
        {
            statusCode = PrinterStatusCode.PaperOut;
            message = "打印机缺纸";
            stateDesc = "PaperOut";
        }
        else if (printerStatus == 6)
        {
            statusCode = PrinterStatusCode.PrinterStopped;
            message = "打印机已停止";
            stateDesc = "Stopped";
        }
        else if (printerStatus == 3 || printerStatus == 4)
        {
            statusCode = PrinterStatusCode.Ready;
            message = printerStatus == 4 ? "打印中" : "打印机就绪";
            stateDesc = printerStatus == 4 ? "Printing" : "Idle";
        }
        else
        {
            statusCode = PrinterStatusCode.PrinterError;
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
            EasyInk.Engine.EngineApi.RaiseLog(LogLevel.Error, $"获取打印机 {printerName} 纸张尺寸失败: {ex.Message}");
        }

        return sizes;
    }
}
