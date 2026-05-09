using System.Collections.Generic;

namespace EasyInk.Engine.Models;

/// <summary>
/// 批量打印结果
/// </summary>
public class BatchPrintResult
{
    /// <summary>
    /// 各任务的执行结果
    /// </summary>
    public List<BatchJobResult> Jobs { get; set; } = new List<BatchJobResult>();
}
