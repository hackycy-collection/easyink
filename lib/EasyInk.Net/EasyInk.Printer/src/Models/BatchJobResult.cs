namespace EasyInk.Printer.Models;

/// <summary>
/// 批量打印单个任务结果
/// </summary>
public class BatchJobResult
{
    public string JobId { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
}
