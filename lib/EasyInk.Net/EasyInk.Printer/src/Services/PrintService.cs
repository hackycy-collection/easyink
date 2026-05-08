using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using EasyInk.Printer.Models;
using EasyInk.Printer.Services.Abstractions;

namespace EasyInk.Printer.Services;

/// <summary>
/// 打印服务，协调打印机状态检查、PDF渲染和打印执行
/// </summary>
public class PrintService : IPrintService
{
    private const string CustomPaperName = "EasyInk Custom";

    private readonly IPrinterService _printerService;
    private readonly IPdfRenderService _pdfRenderService;
    private readonly IAuditService _auditService;

    /// <summary>
    /// 初始化打印服务
    /// </summary>
    /// <param name="printerService">打印机服务</param>
    /// <param name="pdfRenderService">PDF渲染服务</param>
    /// <param name="auditService">审计日志服务</param>
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

        IPdfProvider provider;
        try
        {
            provider = request.CreatePdfProvider();
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(requestId, "INVALID_PDF_SOURCE", ex.Message);
        }

        List<Image> images;
        try
        {
            images = _pdfRenderService.RenderToImages(provider, request.Dpi);
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(requestId, "INVALID_PDF", $"PDF解析失败: {ex.Message}");
        }

        try
        {
            if (images.Count == 0)
            {
                return PrinterResult.Error(requestId, "INVALID_PDF", "PDF渲染失败或为空");
            }

            using (var printDoc = new PrintDocument())
            {
                printDoc.PrinterSettings.PrinterName = request.PrinterName;
                printDoc.PrinterSettings.Copies = (short)request.Copies;
                printDoc.OriginAtMargins = false;
                printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);

                var landscape = request.Landscape;

                if (request.PaperSize != null)
                {
                    landscape = ShouldUseLandscape(request.PaperSize, request.Landscape);
                    printDoc.DefaultPageSettings.PaperSize = CreatePrintPaperSize(request.PaperSize, landscape);
                }

                printDoc.DefaultPageSettings.Landscape = landscape;

                int offsetX = request.Offset?.XInHundredthsOfInch ?? 0;
                int offsetY = request.Offset?.YInHundredthsOfInch ?? 0;

                var currentPage = 0;

                printDoc.PrintPage += (sender, e) =>
                {
                    if (currentPage < images.Count)
                    {
                        var image = images[currentPage];
                        e.Graphics.PageUnit = GraphicsUnit.Display;
                        e.Graphics.TranslateTransform(-e.PageSettings.HardMarginX, -e.PageSettings.HardMarginY);

                        var destRect = CreateDestinationRectangle(e.PageBounds, offsetX, offsetY);
                        e.Graphics.DrawImage(image, destRect);
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

    internal static bool ShouldUseLandscape(PaperSizeParams paperSize, bool requestedLandscape)
    {
        if (requestedLandscape)
            return true;

        if (paperSize == null)
            return false;

        return paperSize.WidthInHundredthsOfInch > paperSize.HeightInHundredthsOfInch;
    }

    internal static PaperSize CreatePrintPaperSize(PaperSizeParams paperSize, bool landscape)
    {
        if (paperSize == null)
            throw new ArgumentNullException(nameof(paperSize));

        var width = paperSize.WidthInHundredthsOfInch;
        var height = paperSize.HeightInHundredthsOfInch;

        if (landscape && width > height)
        {
            var originalWidth = width;
            width = height;
            height = originalWidth;
        }

        return new PaperSize(CustomPaperName, width, height);
    }

    internal static Rectangle CreateDestinationRectangle(Rectangle pageBounds, int offsetX, int offsetY)
    {
        return new Rectangle(offsetX, offsetY, pageBounds.Width, pageBounds.Height);
    }
}
