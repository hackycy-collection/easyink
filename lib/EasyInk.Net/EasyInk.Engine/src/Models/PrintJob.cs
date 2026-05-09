using System;

namespace EasyInk.Engine.Models;

/// <summary>
/// 打印任务信息
/// </summary>
public class PrintJob
{
    /// <summary>
    /// 任务ID
    /// </summary>
    public string JobId { get; set; }

    /// <summary>
    /// 打印机名称
    /// </summary>
    public string PrinterName { get; set; }

    /// <summary>
    /// 任务状态
    /// </summary>
    public string Status { get; set; } = JobStatus.Queued;

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 开始执行时间
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 错误信息
    /// </summary>
    public string ErrorMessage { get; set; }

    /// <summary>
    /// 打印结果
    /// </summary>
    public PrinterResult Result { get; set; }
}
