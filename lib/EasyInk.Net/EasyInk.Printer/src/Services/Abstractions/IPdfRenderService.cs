using System.Collections.Generic;
using System.Drawing;

namespace EasyInk.Printer.Services.Abstractions;

public interface IPdfRenderService
{
    List<Image> RenderToImages(IPdfProvider provider, int dpi);
    void DisposeImages(List<Image> images);
}
