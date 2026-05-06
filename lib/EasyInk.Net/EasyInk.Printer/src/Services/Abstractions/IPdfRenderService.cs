using System.Collections.Generic;
using System.Drawing;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services.Abstractions;

public interface IPdfRenderService
{
    List<Image> RenderToImages(string pdfBase64, int dpi, PaperSizeParams paperSize);
    void DisposeImages(List<Image> images);
}
