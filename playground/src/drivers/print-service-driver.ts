import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { renderPagesToPdfBlob } from '@easyink/export-plugin-dom-pdf'
import { usePrintService } from '../hooks/usePrintService'
import { exportDiagnosticToViewerEvent, getViewerPages, resolvePrintLandscape, resolvePrintOffset, resolvePrintSize, toMillimeters } from '../utils/viewer-output'

/**
 * Print service driver.
 * Renders viewer pages to PDF,
 * then sends the PDF to the print service over WebSocket (binary frame, async print).
 */
export function createPrintServiceDriver(): PrintDriver {
  const service = usePrintService()

  return {
    id: 'print-service-driver',
    async print(context: ViewerPrintContext) {
      if (!service.enabled.value)
        throw new Error('打印服务未启用')

      if (!service.isConnected.value)
        await service.connect()

      if (!service.printerName.value)
        throw new Error('未选择打印机')

      const pages = getViewerPages(context.container)

      const printSize = resolvePrintSize(
        context.printPolicy.sheetSize,
        context.renderedPages[0],
      )
      const widthMm = toMillimeters(printSize.width, printSize.unit)
      const heightMm = toMillimeters(printSize.height, printSize.unit)
      // Print service currently only has boolean landscape; when orientation is "system", fall back to deriving from paper size.
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
      const jobId = await service.printPdf(pdfBlob, {
        printerName: service.printerName.value,
        copies: service.config.copies || 1,
        paperSize: { width: widthMm, height: heightMm, unit: 'mm' },
        landscape,
        offset: resolvePrintOffset(context.printPolicy.offset),
      })

      context.onPhase?.({ phase: 'waiting', message: `等待打印结果 (${jobId.slice(0, 8)})` })
      await service.waitForJob(jobId)
    },
  }
}
