namespace EasyInk.Engine.Models;

/// <summary>
/// 错误信息
/// </summary>
public class ErrorInfo
{
    /// <summary>
    /// 错误码
    /// </summary>
    public string Code { get; set; }

    /// <summary>
    /// 错误消息
    /// </summary>
    public string Message { get; set; }

    /// <summary>
    /// 错误详情
    /// </summary>
    public string Details { get; set; }
}
