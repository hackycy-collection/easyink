using System.Collections.Generic;

namespace EasyInk.Engine.Models;

/// <summary>
/// 插件命令请求
/// </summary>
public class PrinterCommand
{
    /// <summary>
    /// 命令名称
    /// </summary>
    public string Command { get; set; } = default!;

    /// <summary>
    /// 请求ID，用于匹配响应
    /// </summary>
    public string Id { get; set; } = default!;

    /// <summary>
    /// 命令参数
    /// </summary>
    public Dictionary<string, object>? Params { get; set; }
}
