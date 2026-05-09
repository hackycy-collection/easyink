using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace EasyInk.Engine;

/// <summary>
/// 共享 JSON 序列化配置
/// </summary>
public static class JsonConfig
{
    /// <summary>camelCase 命名策略的序列化配置</summary>
    public static readonly JsonSerializerSettings CamelCase = new()
    {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        Formatting = Formatting.None
    };
}
