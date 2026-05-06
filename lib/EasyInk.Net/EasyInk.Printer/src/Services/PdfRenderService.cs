using System.Drawing;
using EasyInk.Printer.Models;

namespace EasyInk.Printer.Services;

/// <summary>
/// PDF渲染服务
/// </summary>
public class PdfRenderService
{
    /// <summary>
    /// 将PDF渲染为图片列表
    /// </summary>
    public List<Image> RenderToImages(string pdfBase64, int dpi, PaperSizeParams paperSize)
    {
        var pdfBytes = Convert.FromBase64String(pdfBase64);
        var images = new List<Image>();

        // TODO: 使用 PDFium 渲染 PDF
        // 目前返回空列表，实际实现需要集成 PDFium
        // using (var document = PdfDocument.Load(pdfBytes))
        // {
        //     for (int i = 0; i < document.PageCount; i++)
        //     {
        //         using (var page = document.GetPage(i))
        //         {
        //             var image = page.Render(dpi, dpi);
        //             images.Add(image);
        //         }
        //     }
        // }

        return images;
    }

    /// <summary>
    /// 释放图片资源
    /// </summary>
    public void DisposeImages(List<Image> images)
    {
        foreach (var image in images)
        {
            image.Dispose();
        }
    }
}
