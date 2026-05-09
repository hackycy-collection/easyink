using System.Collections.Generic;
using EasyInk.Engine.Models;

namespace EasyInk.Engine.Services.Abstractions;

/// <summary>
/// 打印机服务接口
/// </summary>
public interface IPrinterService
{
    /// <summary>
    /// 获取所有打印机列表
    /// </summary>
    List<PrinterInfo> GetPrinters();

    /// <summary>
    /// 获取指定打印机的状态
    /// </summary>
    /// <param name="printerName">打印机名称</param>
    PrinterStatus GetPrinterStatus(string printerName);
}
