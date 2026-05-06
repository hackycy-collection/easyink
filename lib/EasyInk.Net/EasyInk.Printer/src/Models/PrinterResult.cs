using System;

namespace EasyInk.Printer.Models;

/// <summary>
/// 插件命令响应
/// </summary>
public class PrinterResult
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
    public ErrorInfo ErrorInfo { get; set; }

    /// <summary>
    /// 创建成功响应
    /// </summary>
    public static PrinterResult Ok(string id, object data = null)
    {
        return new PrinterResult
        {
            Id = id,
            Success = true,
            Data = data
        };
    }

    /// <summary>
    /// 创建错误响应
    /// </summary>
    public static PrinterResult Error(string id, string code, string message, string details = null)
    {
        return new PrinterResult
        {
            Id = id,
            Success = false,
            ErrorInfo = new ErrorInfo
            {
                Code = code,
                Message = message,
                Details = details
            }
        };
    }
}
