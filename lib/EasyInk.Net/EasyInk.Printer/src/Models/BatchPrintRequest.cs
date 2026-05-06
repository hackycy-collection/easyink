using System.Collections.Generic;

namespace EasyInk.Printer.Models;

public class BatchPrintRequest
{
    public List<PrintRequestParams> Jobs { get; set; } = new List<PrintRequestParams>();
}

public class BatchPrintResult
{
    public List<BatchJobResult> Jobs { get; set; } = new List<BatchJobResult>();
}

public class BatchJobResult
{
    public string JobId { get; set; }
    public string Status { get; set; }
    public string ErrorMessage { get; set; }
}
