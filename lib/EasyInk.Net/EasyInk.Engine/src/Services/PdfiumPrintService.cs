using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;
using PdfiumViewer;

namespace EasyInk.Engine.Services;

/// <summary>
/// 基于 Pdfium + Windows Print Spooler 的打印服务。
/// Pdfium 将 PDF 每页渲染为位图，PrintDocument 通过标准 Windows 打印管线输出。
/// DEVMODE、可打印区域、硬边距全部由 Spooler + 驱动正确协商。
/// </summary>
public class PdfiumPrintService : IPrintService
{
    private readonly IPrinterService _printerService;

    public PdfiumPrintService(IPrinterService printerService)
    {
        _printerService = printerService ?? throw new ArgumentNullException(nameof(printerService));
    }

    public PrinterResult Print(string requestId, PrintRequestParams request)
    {
        var status = _printerService.GetPrinterStatus(request.PrinterName);
        if (!status.IsReady)
            return PrinterResult.Error(requestId, status.StatusCode, status.Message);

        IPdfProvider provider;
        try
        {
            provider = request.CreatePdfProvider();
        }
        catch (Exception ex)
        {
            return PrinterResult.Error(requestId, ErrorCode.InvalidPdfSource, ex.Message);
        }

        var pdfBytes = provider.GetPdfBytes();
        if (pdfBytes == null || pdfBytes.Length == 0)
            return PrinterResult.Error(requestId, ErrorCode.InvalidPdfSource, "PDF 内容为空");

        try
        {
            PrintWithSpooler(requestId, request, pdfBytes);
            EngineApi.RaiseLog(LogLevel.Info, $"打印成功: {request.PrinterName}, jobId={requestId}");
            return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
        }
        catch (Exception ex)
        {
            EngineApi.RaiseLog(LogLevel.Error, $"打印失败: {request.PrinterName}, jobId={requestId}, {ex.Message}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, ex.Message);
        }
    }

    private void PrintWithSpooler(string requestId, PrintRequestParams request, byte[] pdfBytes)
    {
        using var pdfStream = new MemoryStream(pdfBytes);
        using var pdfDoc = PdfDocument.Load(pdfStream);

        int pageCount = pdfDoc.PageCount;
        if (pageCount == 0)
            throw new InvalidOperationException("PDF 无页面");

        float dpi = request.Dpi > 0 ? request.Dpi : 300f;

        // Determine paper dimensions
        float paperWidthMm, paperHeightMm;
        if (request.ForcePaperSize && request.PaperSize != null)
        {
            paperWidthMm = ToMm(request.PaperSize.Width, request.PaperSize.Unit);
            paperHeightMm = ToMm(request.PaperSize.Height, request.PaperSize.Unit);
        }
        else
        {
            // Use PDF's native page dimensions (MediaBox in points → mm)
            var pageSize = pdfDoc.PageSizes[0];
            paperWidthMm = (float)(pageSize.Width / 72.0 * 25.4);
            paperHeightMm = (float)(pageSize.Height / 72.0 * 25.4);
        }

        int renderWidth = (int)Math.Round(paperWidthMm / 25.4 * dpi);
        int renderHeight = (int)Math.Round(paperHeightMm / 25.4 * dpi);

        // Render all pages at the target DPI with correct pixel dimensions
        var pageImages = new Image[pageCount];
        try
        {
            for (int i = 0; i < pageCount; i++)
            {
                pageImages[i] = pdfDoc.Render(i, renderWidth, renderHeight, (int)dpi, (int)dpi,
                    PdfRenderFlags.ForPrinting);
            }

            PrintImages(request, paperWidthMm, paperHeightMm, pageImages);
        }
        finally
        {
            foreach (var img in pageImages)
                img?.Dispose();
        }
    }

    private static void PrintImages(PrintRequestParams request, float paperWidthMm, float paperHeightMm, Image[] pageImages)
    {
        using var printDoc = new PrintDocument();
        printDoc.PrinterSettings.PrinterName = request.PrinterName;

        var paperWidthHundredths = (int)Math.Round(paperWidthMm / 25.4 * 100.0);
        var paperHeightHundredths = (int)Math.Round(paperHeightMm / 25.4 * 100.0);

        // Find matching paper size from printer or use custom
        var paperSize = FindPaperSize(printDoc.PrinterSettings, paperWidthHundredths, paperHeightHundredths)
            ?? new PaperSize("Custom", paperWidthHundredths, paperHeightHundredths);

        printDoc.DefaultPageSettings.PaperSize = paperSize;
        printDoc.DefaultPageSettings.Landscape = request.Landscape;
        printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
        printDoc.OriginAtMargins = false;

        // Manual copies: repeat pages in PrintPage handler.
        // Avoids spooler-level copies which are unreliable for continuous-paper thermal printers.
        short copies = (short)Math.Max(request.Copies, 1);
        int logicalPageCount = pageImages.Length * copies;
        int pageIndex = 0;

        printDoc.PrintPage += (_, e) =>
        {
            if (pageIndex >= logicalPageCount)
            {
                e.HasMorePages = false;
                return;
            }

            var img = pageImages[pageIndex % pageImages.Length];
            var bounds = e.MarginBounds;

            // Set page unit to hundredths of an inch (same as MarginBounds)
            e.Graphics.PageUnit = GraphicsUnit.Display;

            // Scale image to fit printable area preserving aspect ratio
            float scaleX = (float)bounds.Width / img.Width;
            float scaleY = (float)bounds.Height / img.Height;
            float scale = Math.Min(scaleX, scaleY);

            int drawW = (int)(img.Width * scale);
            int drawH = (int)(img.Height * scale);
            int drawX = bounds.Left + (bounds.Width - drawW) / 2;
            int drawY = bounds.Top + (bounds.Height - drawH) / 2;

            e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            e.Graphics.SmoothingMode = SmoothingMode.HighQuality;
            e.Graphics.CompositingQuality = CompositingQuality.HighQuality;

            e.Graphics.DrawImage(img, drawX, drawY, drawW, drawH);

            pageIndex++;
            e.HasMorePages = pageIndex < logicalPageCount;
        };

        printDoc.Print();
    }

    private static PaperSize FindPaperSize(PrinterSettings settings, int targetWidth, int targetHeight)
    {
        PaperSize bestMatch = null;
        int bestScore = int.MaxValue;

        foreach (PaperSize size in settings.PaperSizes)
        {
            int widthDiff = Math.Abs(size.Width - targetWidth);
            int heightDiff = Math.Abs(size.Height - targetHeight);
            int score = widthDiff + heightDiff;

            if (score < bestScore)
            {
                bestScore = score;
                bestMatch = size;
            }
        }

        // Only use match if within reasonable tolerance (0.5 inch = 50 hundredths)
        if (bestMatch != null && bestScore <= 50)
            return bestMatch;

        return null;
    }

    private static float ToMm(double value, string unit)
    {
        return string.Equals(unit, "inch", StringComparison.OrdinalIgnoreCase)
            ? (float)(value * 25.4)
            : (float)value;
    }
}
