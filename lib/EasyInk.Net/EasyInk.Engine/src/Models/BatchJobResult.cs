namespace EasyInk.Engine.Models;

/// <summary>
/// 批量打印单个任务结果
/// </summary>
public class BatchJobResult
{
    /// <summary>
    /// 任务ID
    /// </summary>
    public string JobId { get; set; }

    /// <summary>
    /// 任务状态
    /// </summary>
    public string Status { get; set; }

    /// <summary>
    /// 错误信息
    /// </summary>
    public string ErrorMessage { get; set; }
}
