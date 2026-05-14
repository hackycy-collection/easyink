import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import type { HiPrintClient } from './client'
import { getViewerPages, resolveViewerPrintSize } from '@easyink/print-core'

/**
 * Configures the official Viewer print driver for HiPrint.
 */
export interface HiPrintDriverOptions {
  client: HiPrintClient
  id?: string
  printerName?: string | (() => string | undefined)
  copies?: number | (() => number | undefined)
  forcePageSize?: boolean | ((printerName: string | undefined) => boolean | undefined)
}

/**
 * Creates a Viewer print driver that forwards rendered pages to HiPrint.
 *
 * Use function-valued options when printer settings can change at runtime.
 */
export function createHiPrintDriver(options: HiPrintDriverOptions): PrintDriver {
  return {
    id: options.id ?? 'hiprint',
    defaults: { pageSizeMode: 'driver' },
    async print(context: ViewerPrintContext) {
      const pages = getViewerPages(context.container)
      const { widthMm, heightMm } = resolveViewerPrintSize(context)
      const printerName = resolveValue(options.printerName) ?? options.client.printerName ?? await options.client.useDefaultPrinter()
      const forcePageSize = resolveForcePageSize(options.forcePageSize, printerName)

      context.onPhase?.({ phase: 'printing', message: 'HiPrint 打印中' })
      await options.client.printPages(pages, {
        width: widthMm,
        height: heightMm,
        printerName,
        orientation: context.printPolicy.orientation,
        copies: resolveValue(options.copies),
        forcePageSize,
      }, (progress) => {
        context.onProgress?.({ ...progress, message: 'HiPrint 打印中' })
      })
    },
  }
}

function resolveValue<T>(value: T | (() => T | undefined) | undefined): T | undefined {
  return typeof value === 'function'
    ? (value as () => T | undefined)()
    : value
}

function resolveForcePageSize(
  value: boolean | ((printerName: string | undefined) => boolean | undefined) | undefined,
  printerName: string | undefined,
): boolean | undefined {
  if (typeof value === 'function')
    return value(printerName)
  return value
}
