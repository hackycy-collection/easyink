namespace EasyInk.Engine.Models;

/// <summary>
/// 打印结果
/// </summary>
public class PrintResult
{
    /// <summary>
    /// 打印任务ID
    /// </summary>
    public string JobId { get; set; } = default!;

    /// <summary>
    /// 打印状态
    /// </summary>
    public JobStatus Status { get; set; } = JobStatus.Completed;

    /// <summary>
    /// 创建成功结果
    /// </summary>
    public static PrintResult Success(string jobId)
    {
        return new PrintResult
        {
            JobId = jobId,
            Status = JobStatus.Completed
        };
    }
}
