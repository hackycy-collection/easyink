using System.Collections.Generic;
using System.Drawing;

namespace EasyInk.Printer.Services.Abstractions;

/// <summary>
/// PDF 渲染服务接口
/// </summary>
public interface IPdfRenderService
{
    /// <summary>
    /// 将 PDF 渲染为图片列表
    /// </summary>
    /// <param name="provider">PDF 数据提供者</param>
    /// <param name="dpi">渲染 DPI</param>
    List<Image> RenderToImages(IPdfProvider provider, int dpi);
    /// <summary>
    /// 释放渲染后的图片资源
    /// </summary>
    /// <param name="images">待释放的图片列表</param>
    void DisposeImages(List<Image> images);
}
