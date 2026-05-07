import type { PrintAdapter, ViewerPageMetrics, ViewerPrintContext, ViewerPrintSheetSize } from '@easyink/viewer'
import { usePrinter } from '../hooks/useHiPrint'

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

  if (!renderedPage)
    throw new Error('缺少打印页面尺寸')

  return renderedPage
}

/**
 * HiPrint PrintAdapter for EasyInk Viewer.
 * Uses the singleton printer store (config managed via PrinterSettingsModal).
 */
export function createHiPrintAdapter(): PrintAdapter {
  const printer = usePrinter()

  return {
    id: 'hiprint-adapter',
    async print(context: ViewerPrintContext) {
      if (!printer.enabled.value)
        throw new Error('打印服务未启用')

      if (!printer.isConnected.value)
        await printer.connect()

      if (!printer.printerDevice.value)
        throw new Error('未选择打印机')

      const container = context.container
      if (!container)
        throw new Error('找不到打印内容')

      const pages = Array.from(
        container.querySelectorAll<HTMLElement>('.ei-viewer-page'),
      )
      if (pages.length === 0)
        throw new Error('没有可打印的页面')

      const printerDevice = printer.printerDevice.value
      const printSize = resolvePrintSize(context.printPolicy.sheetSize, context.renderedPages[0])
      const width = toMillimeters(printSize.width, printSize.unit)
      const height = toMillimeters(printSize.height, printSize.unit)

      await printer.printPages(pages, {
        width,
        height,
        printer: printerDevice,
        forcePageSize: printer.isForcePageSize(printerDevice),
      })
    },
  }
}
