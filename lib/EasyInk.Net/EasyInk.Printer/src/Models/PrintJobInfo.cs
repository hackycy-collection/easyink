namespace EasyInk.Printer.Models;

public class PrintJobInfo
{
    public string JobId { get; set; }
    public string PrinterName { get; set; }
    public string Status { get; set; } = "queued";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string ErrorMessage { get; set; }
    public CommandResponse Result { get; set; }
}
