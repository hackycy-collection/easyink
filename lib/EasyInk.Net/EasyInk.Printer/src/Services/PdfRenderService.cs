using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using EasyInk.Printer.Services.Abstractions;
using PdfiumViewer;

namespace EasyInk.Printer.Services;

public class PdfRenderService : IPdfRenderService
{
    private const int MaxDpi = 600;
    private const long MaxPdfBytes = 50L * 1024 * 1024; // 50MB
    private const int MaxPages = 200;

    public List<Image> RenderToImages(IPdfProvider provider, int dpi)
    {
        if (provider == null)
            throw new ArgumentNullException(nameof(provider));
        if (dpi <= 0 || dpi > MaxDpi)
            throw new ArgumentException($"DPI 必须在 1-{MaxDpi} 之间，当前值: {dpi}");

        var pdfBytes = provider.GetPdfBytes();
        if (pdfBytes.Length > MaxPdfBytes)
            throw new ArgumentException($"PDF 文件过大: {pdfBytes.Length / 1024 / 1024}MB，上限 {MaxPdfBytes / 1024 / 1024}MB");

        var images = new List<Image>();

        try
        {
            using (var stream = new MemoryStream(pdfBytes))
            using (var document = PdfDocument.Load(stream))
            {
                if (document.PageCount > MaxPages)
                    throw new ArgumentException($"PDF 页数过多: {document.PageCount} 页，上限 {MaxPages} 页");

                for (int i = 0; i < document.PageCount; i++)
                {
                    var image = document.Render(i, dpi, dpi, true);
                    images.Add(image);
                }
            }

            return images;
        }
        catch
        {
            DisposeImages(images);
            throw;
        }
    }

    public void DisposeImages(List<Image> images)
    {
        foreach (var image in images)
        {
            image.Dispose();
        }
    }
}
