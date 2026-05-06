using System.Collections.Generic;

namespace EasyInk.Printer.Models;

/// <summary>
/// 批量打印结果
/// </summary>
public class BatchPrintResult
{
    public List<BatchJobResult> Jobs { get; set; } = new List<BatchJobResult>();
}
