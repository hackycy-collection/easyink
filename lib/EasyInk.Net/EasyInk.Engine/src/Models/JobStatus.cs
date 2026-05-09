namespace EasyInk.Engine.Models;

/// <summary>
/// 打印任务状态常量
/// </summary>
public static class JobStatus
{
    public const string Queued = "queued";
    public const string Printing = "printing";
    public const string Completed = "completed";
    public const string Failed = "failed";
}
