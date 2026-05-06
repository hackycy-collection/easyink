using Newtonsoft.Json.Linq;

namespace EasyInk.Printer.Models;

/// <summary>
/// 命令请求模型
/// </summary>
public class CommandRequest
{
    /// <summary>
    /// 命令名称
    /// </summary>
    public string Command { get; set; }

    /// <summary>
    /// 请求ID，用于匹配响应
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// 命令参数
    /// </summary>
    public Dictionary<string, object> Params { get; set; }
}
