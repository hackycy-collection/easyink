import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import type { EasyInkPrinterClient, EasyInkPrinterPrintPdfOptions } from './client'
import { renderPagesToPdfBlob } from '@easyink/export-plugin-dom-pdf'
import { exportDiagnosticToViewerEvent, getViewerPages, resolvePrintLandscape, resolvePrintOffset, resolveViewerPrintSize } from '@easyink/print-core'

export interface EasyInkPrinterDriverOptions {
  client: EasyInkPrinterClient
  id?: string
  printerName?: string | (() => string | undefined)
  copies?: number | (() => number | undefined)
  forcePaperSize?: boolean | (() => boolean | undefined)
  dpi?: number | (() => number | undefined)
  waitForCompletion?: boolean
}

export function createEasyInkPrinterDriver(options: EasyInkPrinterDriverOptions): PrintDriver {
  return {
    id: options.id ?? 'easyink-printer',
    defaults: { pageSizeMode: 'fixed' },
    async print(context: ViewerPrintContext) {
      const pages = getViewerPages(context.container)
      const { widthMm, heightMm } = resolveViewerPrintSize(context)
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
      const printOptions: EasyInkPrinterPrintPdfOptions = {
        printerName: resolveValue(options.printerName),
        copies: resolveValue(options.copies),
        paperSize: resolveValue(options.forcePaperSize)
          ? { width: widthMm, height: heightMm, unit: 'mm' }
          : undefined,
        forcePaperSize: resolveValue(options.forcePaperSize),
        landscape,
        offset: resolvePrintOffset(context.printPolicy.offset),
        dpi: resolveValue(options.dpi),
      }

      const jobId = await options.client.printPdf(pdfBlob, printOptions)
      if (options.waitForCompletion === false)
        return

      context.onPhase?.({ phase: 'waiting', message: `等待打印结果 (${jobId.slice(0, 8)})` })
      await options.client.waitForJob(jobId)
    },
  }
}

function resolveValue<T>(value: T | (() => T | undefined) | undefined): T | undefined {
  return typeof value === 'function'
    ? (value as () => T | undefined)()
    : value
}
