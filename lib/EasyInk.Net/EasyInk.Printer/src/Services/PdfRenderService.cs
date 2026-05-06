using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using EasyInk.Printer.Services.Abstractions;
using PdfiumViewer;

namespace EasyInk.Printer.Services;

public class PdfRenderService : IPdfRenderService
{
    public List<Image> RenderToImages(string pdfBase64, int dpi)
    {
        var pdfBytes = Convert.FromBase64String(pdfBase64);
        var images = new List<Image>();

        using (var stream = new MemoryStream(pdfBytes))
        using (var document = PdfDocument.Load(stream))
        {
            for (int i = 0; i < document.PageCount; i++)
            {
                var image = document.Render(i, dpi, dpi, true);
                images.Add(image);
            }
        }

        return images;
    }

    public void DisposeImages(List<Image> images)
    {
        foreach (var image in images)
        {
            image.Dispose();
        }
    }
}
