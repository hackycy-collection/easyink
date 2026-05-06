namespace EasyInk.Printer.Models;

public class PrintAuditLog
{
    public long Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string PrinterName { get; set; }
    public double? PaperWidth { get; set; }
    public double? PaperHeight { get; set; }
    public string PaperUnit { get; set; }
    public int Copies { get; set; } = 1;
    public int? Dpi { get; set; }
    public string UserId { get; set; }
    public string LabelType { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
    public string JobId { get; set; }
    public DateTime CreatedAt { get; set; }
}
