namespace EasyInk.Printer.Models;

/// <summary>
/// 命令响应模型
/// </summary>
public class CommandResponse
{
    /// <summary>
    /// 请求ID
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// 响应数据
    /// </summary>
    public object Data { get; set; }

    /// <summary>
    /// 错误信息
    /// </summary>
    public ErrorInfo Error { get; set; }

    /// <summary>
    /// 创建成功响应
    /// </summary>
    public static CommandResponse Ok(string id, object data = null)
    {
        return new CommandResponse
        {
            Id = id,
            Success = true,
            Data = data
        };
    }

    /// <summary>
    /// 创建错误响应
    /// </summary>
    public static CommandResponse Error(string id, string code, string message, string details = null)
    {
        return new CommandResponse
        {
            Id = id,
            Success = false,
            Error = new ErrorInfo
            {
                Code = code,
                Message = message,
                Details = details
            }
        };
    }
}

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
