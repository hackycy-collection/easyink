import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { renderPagesToPdfBlob } from '@easyink/export-plugin-dom-pdf'
import { usePrinterHost } from '../hooks/usePrinterHost'
import { exportDiagnosticToViewerEvent, getViewerPages, resolvePrintLandscape, resolvePrintOffset, resolvePrintSize, toMillimeters } from '../utils/viewer-output'

/**
 * Printer.Host print driver.
 * Renders viewer pages to PDF,
 * then sends the PDF to Printer.Host over WebSocket (binary frame, async print).
 */
export function createPrinterHostDriver(): PrintDriver {
  const host = usePrinterHost()

  return {
    id: 'printer-host-driver',
    async print(context: ViewerPrintContext) {
      if (!host.enabled.value)
        throw new Error('Printer.Host 未启用')

      if (!host.isConnected.value)
        await host.connect()

      if (!host.printerName.value)
        throw new Error('未选择打印机')

      const pages = getViewerPages(context.container)

      const printSize = resolvePrintSize(
        context.printPolicy.sheetSize,
        context.renderedPages[0],
      )
      const widthMm = toMillimeters(printSize.width, printSize.unit)
      const heightMm = toMillimeters(printSize.height, printSize.unit)
      // Printer.Host 当前只有 boolean landscape；当方向为“系统”时回退到按纸张尺寸推导。
      const landscape = resolvePrintLandscape(context.printPolicy.orientation, widthMm, heightMm)

      context.onPhase?.({ phase: 'preparing', message: '生成 PDF 中' })
      const pdfBlob = await renderPagesToPdfBlob({
        pages,
        widthMm,
        heightMm,
        onProgress: context.onProgress,
        onDiagnostic: diagnostic => context.onDiagnostic?.(exportDiagnosticToViewerEvent(diagnostic)),
      })

      context.onPhase?.({ phase: 'submitting', message: '发送打印任务' })
      const jobId = await host.printPdf(pdfBlob, {
        printerName: host.printerName.value,
        copies: host.config.copies || 1,
        paperSize: { width: widthMm, height: heightMm, unit: 'mm' },
        landscape,
        offset: resolvePrintOffset(context.printPolicy.offset),
      })

      context.onPhase?.({ phase: 'waiting', message: `等待打印结果 (${jobId.slice(0, 8)})` })
      await host.waitForJob(jobId)
    },
  }
}
