import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { usePrinter } from '../hooks/useHiPrint'
import { getViewerPages, resolvePrintSize, toMillimeters } from '../utils/viewer-output'

/**
 * HiPrint print driver for EasyInk Viewer.
 * Uses the singleton printer store (config managed via PrinterSettingsModal).
 */
export function createHiPrintDriver(): PrintDriver {
  const printer = usePrinter()

  return {
    id: 'hiprint-driver',
    async print(context: ViewerPrintContext) {
      if (!printer.enabled.value)
        throw new Error('打印服务未启用')

      if (!printer.isConnected.value)
        await printer.connect()

      if (!printer.printerDevice.value)
        throw new Error('未选择打印机')

      const pages = getViewerPages(context.container)

      const printerDevice = printer.printerDevice.value
      const printSize = resolvePrintSize(context.printPolicy.sheetSize, context.renderedPages[0])
      const width = toMillimeters(printSize.width, printSize.unit)
      const height = toMillimeters(printSize.height, printSize.unit)

      context.onPhase?.({ phase: 'printing', message: 'HiPrint 打印中' })
      await printer.printPages(pages, {
        width,
        height,
        orientation: context.printPolicy.orientation,
        printer: printerDevice,
        forcePageSize: printer.isForcePageSize(printerDevice),
      }, (progress) => {
        context.onProgress?.({ ...progress, message: 'HiPrint 打印中' })
      })
    },
  }
}
