using EasyInk.Engine.Models;

namespace EasyInk.Engine.Services.Abstractions;

/// <summary>
/// 打印服务接口
/// </summary>
public interface IPrintService
{
    /// <summary>
    /// 执行打印
    /// </summary>
    /// <param name="requestId">请求ID</param>
    /// <param name="request">打印请求参数</param>
    PrinterResult Print(string requestId, PrintRequestParams request);
}
