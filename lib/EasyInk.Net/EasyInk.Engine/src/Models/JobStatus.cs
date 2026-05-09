namespace EasyInk.Engine.Models;

/// <summary>
/// 打印任务状态常量
/// </summary>
public static class JobStatus
{
    /// <summary>排队中</summary>
    public const string Queued = "queued";
    /// <summary>打印中</summary>
    public const string Printing = "printing";
    /// <summary>已完成</summary>
    public const string Completed = "completed";
    /// <summary>失败</summary>
    public const string Failed = "failed";
}
