using System.Collections.Generic;
using System.Drawing;

namespace EasyInk.Printer.Services.Abstractions;

public interface IPdfRenderService
{
    List<Image> RenderToImages(string pdfBase64, int dpi);
    void DisposeImages(List<Image> images);
}
