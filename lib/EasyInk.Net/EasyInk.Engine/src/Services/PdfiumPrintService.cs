using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using System.Threading;
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
    private const int DefaultRenderDpi = 600;
    private const int MaxRenderDpi = 1200;

    private readonly IPrinterService _printerService;
    private readonly ILogger _logger;

    /// <summary>
    /// 初始化 Pdfium 打印服务
    /// </summary>
    public PdfiumPrintService(IPrinterService printerService, ILogger? logger = null)
    {
        _printerService = printerService ?? throw new ArgumentNullException(nameof(printerService));
        _logger = logger ?? new NullLogger();
    }

    /// <summary>
    /// 执行打印任务
    /// </summary>
    public PrinterResult Print(string requestId, PrintRequestParams request, CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested)
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印已取消");

        // IsReady 仅在确知打印机不可用时为 false（离线、卡纸、缺纸、已停止）。
        // WMI 查询失败/超时/不可用时 IsReady 必须为 true —— 状态未知不等于不可用，
        // 误拦截会导致实际可用的打印机无法打印。
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
            PrintWithSpooler(requestId, request, pdfBytes, cancellationToken);
            _logger.Log(LogLevel.Info, $"打印成功: {request.PrinterName}, jobId={requestId}");
            return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
        }
        catch (OperationCanceledException)
        {
            _logger.Log(LogLevel.Info, $"打印已取消: {request.PrinterName}, jobId={requestId}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印已取消");
        }
        catch (Exception ex)
        {
            _logger.Log(LogLevel.Error, $"打印失败: {request.PrinterName}, jobId={requestId}, {ex}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印失败，请检查打印机状态后重试");
        }
    }

    private void PrintWithSpooler(string requestId, PrintRequestParams request, byte[] pdfBytes, CancellationToken cancellationToken)
    {
        using var pdfStream = new MemoryStream(pdfBytes);
        using var pdfDoc = PdfDocument.Load(pdfStream);

        int pageCount = pdfDoc.PageCount;
        if (pageCount == 0)
            throw new InvalidOperationException("PDF 无页面");

        var pdfPageSize = pdfDoc.PageSizes[0];
        float contentWidthMm = (float)(pdfPageSize.Width / 72.0 * 25.4);
        float contentHeightMm = (float)(pdfPageSize.Height / 72.0 * 25.4);

        if (request.ForcePaperSize && request.PaperSize != null)
        {
            contentWidthMm = ToMm(request.PaperSize.Width, request.PaperSize.Unit);
            contentHeightMm = ToMm(request.PaperSize.Height, request.PaperSize.Unit);
        }

        float offsetXUnits = 0, offsetYUnits = 0;
        if (request.Offset != null)
        {
            offsetXUnits = (float)(ToMm(request.Offset.X, request.Offset.Unit) / 25.4 * 100.0);
            offsetYUnits = (float)(ToMm(request.Offset.Y, request.Offset.Unit) / 25.4 * 100.0);
        }

        // 软件边距：补偿驱动不报告的物理硬边距（如 XP-80C 热敏打印机）
        float softMarginUnits = request.Margin > 0
            ? (float)(request.Margin / 25.4 * 100.0)
            : 0;

        using var printDoc = new PrintDocument();
        printDoc.PrinterSettings.PrinterName = request.PrinterName;

        if (request.ForcePaperSize && request.PaperSize != null)
        {
            var paperWidthHundredths = (int)Math.Round(contentWidthMm / 25.4 * 100.0);
            var paperHeightHundredths = (int)Math.Round(contentHeightMm / 25.4 * 100.0);
            printDoc.DefaultPageSettings.PaperSize = new PaperSize("EasyInk Custom",
                paperWidthHundredths, paperHeightHundredths);
        }

        printDoc.DefaultPageSettings.Landscape = request.Landscape;
        printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
        printDoc.OriginAtMargins = false;

        short copies = (short)Math.Max(request.Copies, 1);
        int logicalPageCount = pageCount * copies;
        int pageIndex = 0;

        // Render each page on-demand in PrintPage to bound memory to a single bitmap at a time.
        printDoc.PrintPage += (_, e) =>
        {
            if (cancellationToken.IsCancellationRequested || pageIndex >= logicalPageCount)
            {
                e.HasMorePages = false;
                return;
            }

            int pdfPageIndex = pageIndex % pageCount;
            var ps = e.PageSettings;
            var pb = e.PageBounds;
            var printable = GetEffectiveDrawingArea(ps, pb, softMarginUnits);

            int renderDpi = GetRenderDpi(request, ps);
            float contentWUnits = contentWidthMm / 25.4f * 100f;
            float contentHUnits = contentHeightMm / 25.4f * 100f;
            float targetScale = Math.Min(printable.Width / contentWUnits, printable.Height / contentHUnits);
            int renderWidth = Math.Max(1, (int)Math.Round(contentWUnits / 100f * renderDpi * targetScale));
            int renderHeight = Math.Max(1, (int)Math.Round(contentHUnits / 100f * renderDpi * targetScale));

            using (var img = pdfDoc.Render(pdfPageIndex, renderWidth, renderHeight, renderDpi, renderDpi,
                PdfRenderFlags.ForPrinting))
            {
                float unitsPerPixel = 100f / renderDpi;
                float imgWUnits = img.Width * unitsPerPixel;
                float imgHUnits = img.Height * unitsPerPixel;

                // 等比缩放适配
                float scaleX = printable.Width / imgWUnits;
                float scaleY = printable.Height / imgHUnits;
                float scale = Math.Min(scaleX, scaleY);

                float drawW = imgWUnits * scale;
                float drawH = imgHUnits * scale;
                float drawX = printable.X + (printable.Width - drawW) / 2f + offsetXUnits;
                float drawY = printable.Y + (printable.Height - drawH) / 2f + offsetYUnits;

                if (pageIndex < pageCount)
                {
                    _logger.Log(LogLevel.Info,
                        $"[PrintDiag] page={pdfPageIndex}" +
                        $" content=({contentWidthMm:F1}x{contentHeightMm:F1}mm)" +
                        $" driverPaper=({ps.PaperSize.Width}x{ps.PaperSize.Height})" +
                        $" pageBounds=({pb.Width},{pb.Height})" +
                        $" printableArea=({ps.PrintableArea.X},{ps.PrintableArea.Y} {ps.PrintableArea.Width}x{ps.PrintableArea.Height})" +
                        $" hardMargin=({ps.HardMarginX},{ps.HardMarginY})" +
                        $" softMargin={softMarginUnits:F1}" +
                        $" effectiveDrawing=({printable.X:F1},{printable.Y:F1} {printable.Width:F1}x{printable.Height:F1})" +
                        $" img=({imgWUnits:F1}x{imgHUnits:F1})" +
                        $" render=({renderWidth}x{renderHeight}@{renderDpi}dpi)" +
                        $" scale=({scaleX:F3}x{scaleY:F3}->{scale:F3})" +
                        $" draw=({drawX:F1},{drawY:F1} {drawW:F1}x{drawH:F1})");
                }

                e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                e.Graphics.SmoothingMode = SmoothingMode.HighQuality;
                e.Graphics.CompositingQuality = CompositingQuality.HighQuality;

                e.Graphics.DrawImage(img, drawX, drawY, drawW, drawH);
            }

            pageIndex++;
            e.HasMorePages = !cancellationToken.IsCancellationRequested && pageIndex < logicalPageCount;
        };

        printDoc.Print();
    }

    private static int GetRenderDpi(PrintRequestParams request, PageSettings pageSettings)
    {
        int requestedDpi = request.Dpi > 0 ? request.Dpi : DefaultRenderDpi;
        int printerDpi = Math.Max(pageSettings.PrinterResolution.X, pageSettings.PrinterResolution.Y);
        int dpi = Math.Max(requestedDpi, printerDpi > 0 ? printerDpi : DefaultRenderDpi);
        return Math.Max(72, Math.Min(dpi, MaxRenderDpi));
    }

    private static RectangleF GetEffectiveDrawingArea(PageSettings pageSettings, Rectangle pageBounds, float softMarginUnits)
    {
        var printable = pageSettings.PrintableArea;
        float width;
        float height;

        if (printable.Width > 0 && printable.Height > 0)
        {
            // With OriginAtMargins=false the Graphics origin is normally already
            // translated to the printable area's top-left. Use printable size,
            // not printable X/Y, to avoid applying the hard margin twice.
            width = pageSettings.Landscape ? printable.Height : printable.Width;
            height = pageSettings.Landscape ? printable.Width : printable.Height;
        }
        else
        {
            float marginLeft = Math.Max(pageSettings.HardMarginX, softMarginUnits);
            float marginTop = Math.Max(pageSettings.HardMarginY, softMarginUnits);
            float marginRight = marginLeft;
            float marginBottom = marginTop;

            width = pageBounds.Width - marginLeft - marginRight;
            height = pageBounds.Height - marginTop - marginBottom;
        }

        width = Math.Max(1f, Math.Min(width, pageBounds.Width));
        height = Math.Max(1f, Math.Min(height, pageBounds.Height));

        if (softMarginUnits <= 0)
            return new RectangleF(0, 0, width, height);

        return new RectangleF(
            softMarginUnits,
            softMarginUnits,
            Math.Max(1f, width - softMarginUnits * 2f),
            Math.Max(1f, height - softMarginUnits * 2f));
    }

    private static float ToMm(double value, string unit)
    {
        return string.Equals(unit, "inch", StringComparison.OrdinalIgnoreCase)
            ? (float)(value * 25.4)
            : (float)value;
    }
}
