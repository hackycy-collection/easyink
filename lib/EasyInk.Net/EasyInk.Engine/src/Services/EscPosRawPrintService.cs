using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Threading;
using EasyInk.Engine.Models;
using EasyInk.Engine.Services.Abstractions;
using PdfiumViewer;

namespace EasyInk.Engine.Services;

/// <summary>
/// 热敏打印机 Raw ESC/POS 打印服务。
/// PDF → Pdfium 渲染为灰度位图 → 二值化 → ESC/POS GS v 0 位图指令 → WritePrinter 直发。
/// 完全绕过 Windows 打印驱动，消除硬边距/缩放/纸张匹配等问题。
/// </summary>
public class EscPosRawPrintService : IPrintService
{
    private readonly int _dpi;
    private readonly int _maxDotsWidth;

    private readonly IPrinterService _printerService;
    private readonly ILogger _logger;

    public EscPosRawPrintService(IPrinterService printerService, ILogger? logger = null, int dpi = 203, int maxDotsWidth = 576)
    {
        _dpi = dpi;
        _maxDotsWidth = maxDotsWidth;
        _printerService = printerService ?? throw new ArgumentNullException(nameof(printerService));
        _logger = logger ?? new NullLogger();
    }

    public PrinterResult Print(string requestId, PrintRequestParams request, CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested)
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印已取消");

        var status = _printerService.GetPrinterStatus(request.PrinterName);
        if (!status.IsReady)
            return PrinterResult.Error(requestId, status.StatusCode, status.Message);

        IPdfProvider provider;
        try { provider = request.CreatePdfProvider(); }
        catch (Exception ex) { return PrinterResult.Error(requestId, ErrorCode.InvalidPdfSource, ex.Message); }

        var pdfBytes = provider.GetPdfBytes();
        if (pdfBytes == null || pdfBytes.Length == 0)
            return PrinterResult.Error(requestId, ErrorCode.InvalidPdfSource, "PDF 内容为空");

        try
        {
            var bands = RenderPdfToEscPosBands(pdfBytes, cancellationToken);
            var init = BitmapToEscPos.CmdInit();
            var cut = BitmapToEscPos.CmdCut();

            // init + [band0, band1, ...] + cut，逐批发送，band 间延时 80ms
            var batches = new byte[1 + bands.Count + 1][];
            batches[0] = init;
            for (int i = 0; i < bands.Count; i++) batches[1 + i] = bands[i];
            batches[batches.Length - 1] = cut;

            NativePrintApi.SendRawBatched(request.PrinterName, batches,
                $"EasyInk-{requestId.Substring(0, Math.Min(8, requestId.Length))}", delayMs: 80);

            _logger.Log(LogLevel.Info, $"Raw 打印成功: {request.PrinterName}, jobId={requestId}");
            return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
        }
        catch (OperationCanceledException)
        {
            _logger.Log(LogLevel.Info, $"打印已取消: {request.PrinterName}, jobId={requestId}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印已取消");
        }
        catch (Exception ex)
        {
            _logger.Log(LogLevel.Error, $"Raw 打印失败: {request.PrinterName}, jobId={requestId}, {ex}");
            return PrinterResult.Error(requestId, ErrorCode.PrintFailed, "打印失败，请检查打印机状态后重试");
        }
    }

    private System.Collections.Generic.List<byte[]> RenderPdfToEscPosBands(byte[] pdfBytes, CancellationToken cancellationToken)
    {
        using var pdfStream = new MemoryStream(pdfBytes);
        using var pdfDoc = PdfDocument.Load(pdfStream);

        int pageCount = pdfDoc.PageCount;
        if (pageCount == 0)
            throw new InvalidOperationException("PDF 无页面");

        var pageSize = pdfDoc.PageSizes[0];
        float paperWidthMm = (float)(pageSize.Width / 72.0 * 25.4);
        float paperHeightMm = (float)(pageSize.Height / 72.0 * 25.4);

        float scale = (float)_maxDotsWidth / (paperWidthMm / 25.4f * _dpi);
        int renderWidth = _maxDotsWidth;
        int renderHeight = (int)Math.Round(paperHeightMm / 25.4f * _dpi * scale);

        _logger.Log(LogLevel.Info,
            $"[RawPrint] paper={paperWidthMm:F1}x{paperHeightMm:F1}mm" +
            $" render={renderWidth}x{renderHeight}px@{_dpi}dpi" +
            $" scale={scale:F3} pages={pageCount}");

        using var fullImage = new Bitmap(renderWidth, renderHeight * pageCount, PixelFormat.Format24bppRgb);
        using var g = Graphics.FromImage(fullImage);
        g.Clear(Color.White);

        for (int i = 0; i < pageCount; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var pageImg = pdfDoc.Render(i, renderWidth, renderHeight, _dpi, _dpi, PdfRenderFlags.ForPrinting);
            g.DrawImage(pageImg, 0, i * renderHeight);
        }

        return BitmapToEscPos.ConvertToBands(fullImage);
    }
}
