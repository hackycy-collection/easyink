using System.Collections.Generic;

namespace EasyInk.Printer.Models;

/// <summary>
/// 批量打印请求
/// </summary>
public class BatchPrintRequest
{
    /// <summary>
    /// 打印任务列表
    /// </summary>
    public List<PrintRequestParams> Jobs { get; set; } = new List<PrintRequestParams>();
}
