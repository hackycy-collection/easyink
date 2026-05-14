using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace EasyInk.Engine.Models;

/// <summary>
/// 打印任务状态
/// </summary>
[JsonConverter(typeof(StringEnumConverter), true)]
public enum JobStatus
{
    /// <summary>排队中</summary>
    Queued,
    /// <summary>打印中</summary>
    Printing,
    /// <summary>已完成</summary>
    Completed,
    /// <summary>失败</summary>
    Failed
}
