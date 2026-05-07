using System.Collections.Generic;

namespace EasyInk.Printer.Models;

/// <summary>
/// 批量打印请求
/// </summary>
public class BatchPrintRequest
{
    public List<PrintRequestParams> Jobs { get; set; } = new List<PrintRequestParams>();
}
