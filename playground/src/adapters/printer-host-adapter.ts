import type { PrintAdapter, ViewerPageMetrics, ViewerPrintContext, ViewerPrintSheetSize } from '@easyink/viewer'
import { usePrinterHost } from '../hooks/usePrinterHost'
import { renderPagesToPdfBlob } from '../utils/pdf-export'

const UNIT_TO_MM = {
  cm: 10,
  in: 25.4,
  mm: 1,
  pt: 0.352778,
} as const

function toMillimeters(value: number, unit: string): number {
  const factor = UNIT_TO_MM[unit as keyof typeof UNIT_TO_MM] || 1
  return value * factor
}

function resolvePrintSize(
  sheetSize: ViewerPrintSheetSize | undefined,
  renderedPage: ViewerPageMetrics | undefined,
): { width: number, height: number, unit: string } {
  if (sheetSize)
    return sheetSize
  if (renderedPage)
    return renderedPage
  throw new Error('缺少打印页面尺寸')
}

/**
 * Printer.Host PrintAdapter.
 * Renders viewer pages to PDF,
 * then sends the PDF to Printer.Host over WebSocket (binary frame, async print).
 */
export function createPrinterHostAdapter(): PrintAdapter {
  const host = usePrinterHost()

  return {
    id: 'printer-host-adapter',
    async print(context: ViewerPrintContext) {
      if (!host.enabled.value)
        throw new Error('Printer.Host 未启用')

      if (!host.isConnected.value)
        await host.connect()

      if (!host.printerName.value)
        throw new Error('未选择打印机')

      const container = context.container
      if (!container)
        throw new Error('找不到打印内容')

      const pages = Array.from(
        container.querySelectorAll<HTMLElement>('.ei-viewer-page'),
      )
      if (pages.length === 0)
        throw new Error('没有可打印的页面')

      const printSize = resolvePrintSize(
        context.printPolicy.sheetSize,
        context.renderedPages[0],
      )
      const widthMm = toMillimeters(printSize.width, printSize.unit)
      const heightMm = toMillimeters(printSize.height, printSize.unit)

      const pdfBlob = await renderPagesToPdfBlob({ pages, widthMm, heightMm })

      // send to Printer.Host via WebSocket binary frame
      const jobId = await host.printPdf(pdfBlob, {
        printerName: host.printerName.value,
        copies: host.config.copies || 1,
        paperSize: { width: widthMm, height: heightMm, unit: 'mm' },
      })

      // wait for async job to complete
      await host.waitForJob(jobId)
    },
  }
}
