using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services;

public class PrintService : IPrintService
{
    private readonly IPrinterService _printerService;
    private readonly IPdfRenderService _pdfRenderService;
    private readonly IAuditService _auditService;

    public PrintService(IPrinterService printerService, IPdfRenderService pdfRenderService, IAuditService auditService)
    {
        _printerService = printerService;
        _pdfRenderService = pdfRenderService;
        _auditService = auditService;
    }

    /// <summary>
    /// 执行打印
    /// </summary>
    public PrinterResult Print(string requestId, PrintRequestParams request)
    {
        var status = _printerService.GetPrinterStatus(request.PrinterName);
        if (!status.IsReady)
        {
            return PrinterResult.Error(requestId, status.StatusCode, status.Message);
        }

        List<Image> images = null;
        try
        {
            images = _pdfRenderService.RenderToImages(request.PdfBase64, request.Dpi);
            if (images.Count == 0)
            {
                return PrinterResult.Error(requestId, "INVALID_PDF", "PDF渲染失败或为空");
            }
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(requestId, "INVALID_PDF", $"PDF解析失败: {ex.Message}");
        }

        try
        {
            using (var printDoc = new PrintDocument())
            {
                printDoc.PrinterSettings.PrinterName = request.PrinterName;
                printDoc.PrinterSettings.Copies = (short)request.Copies;

                if (request.PaperSize != null)
                {
                    var paperSize = new PaperSize(
                        "Custom",
                        request.PaperSize.WidthInHundredthsOfInch,
                        request.PaperSize.HeightInHundredthsOfInch
                    );
                    printDoc.DefaultPageSettings.PaperSize = paperSize;
                }

                if (request.Offset != null)
                {
                    printDoc.DefaultPageSettings.Margins = new Margins(
                        Math.Max(0, request.Offset.XInHundredthsOfInch),
                        0,
                        Math.Max(0, request.Offset.YInHundredthsOfInch),
                        0
                    );
                }

                var currentPage = 0;

                printDoc.PrintPage += (sender, e) =>
                {
                    if (currentPage < images.Count)
                    {
                        var image = images[currentPage];
                        e.Graphics.DrawImage(image, e.MarginBounds);
                        currentPage++;
                        e.HasMorePages = currentPage < images.Count;
                    }
                };

                printDoc.Print();
            }

            _auditService.LogPrint(new PrintAuditLog
            {
                Timestamp = DateTime.UtcNow,
                PrinterName = request.PrinterName,
                PaperWidth = request.PaperSize?.Width,
                PaperHeight = request.PaperSize?.Height,
                PaperUnit = request.PaperSize?.Unit,
                Copies = request.Copies,
                Dpi = request.Dpi,
                UserId = request.UserData?.UserId,
                LabelType = request.UserData?.LabelType,
                Status = "Success",
                JobId = requestId
            });

            return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
        }
        catch (Exception ex)
        {
            _auditService.LogPrint(new PrintAuditLog
            {
                Timestamp = DateTime.UtcNow,
                PrinterName = request.PrinterName,
                Status = "Failed",
                ErrorMessage = ex.Message,
                JobId = requestId
            });

            return PrinterResult.Error(requestId, "PRINT_FAILED", ex.Message);
        }
        finally
        {
            if (images != null)
                _pdfRenderService.DisposeImages(images);
        }
    }
}
