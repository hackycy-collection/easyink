import type { ExportDiagnostic } from '@easyink/export-runtime'
import type { ViewerDiagnosticEvent, ViewerPageMetrics, ViewerPrintContext, ViewerPrintSheetSize } from '@easyink/viewer'

const UNIT_TO_MM = {
  cm: 10,
  in: 25.4,
  inch: 25.4,
  mm: 1,
  pt: 0.352778,
  px: 25.4 / 96,
} as const

export function toMillimeters(value: number, unit: string): number {
  const factor = UNIT_TO_MM[unit as keyof typeof UNIT_TO_MM] || 1
  return value * factor
}

export function resolvePrintSize(
  sheetSize: ViewerPrintSheetSize | undefined,
  renderedPage: ViewerPageMetrics | undefined,
): { width: number, height: number, unit: string } {
  if (sheetSize)
    return sheetSize
  if (renderedPage)
    return renderedPage
  throw new Error('缺少打印页面尺寸')
}

export function resolvePrintOffset(offset: ViewerPrintContext['printPolicy']['offset']): { x: number, y: number, unit: 'mm' } | undefined {
  const x = toMillimeters(offset.horizontal, offset.unit)
  const y = toMillimeters(offset.vertical, offset.unit)
  if (x === 0 && y === 0)
    return undefined
  return { x, y, unit: 'mm' }
}

export function resolveExplicitPrintLandscape(
  orientation: ViewerPrintContext['printPolicy']['orientation'],
): boolean | undefined {
  if (orientation === 'landscape')
    return true
  if (orientation === 'portrait')
    return false
  return undefined
}

export function resolvePrintLandscape(
  orientation: ViewerPrintContext['printPolicy']['orientation'],
  width: number,
  height: number,
): boolean {
  return resolveExplicitPrintLandscape(orientation) ?? width > height
}

export function getViewerPages(container: HTMLElement | undefined): HTMLElement[] {
  if (!container)
    throw new Error('找不到打印内容')
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.ei-viewer-page'))
  if (pages.length === 0)
    throw new Error('没有可输出的页面')
  return pages
}

export function exportDiagnosticToViewerEvent(diagnostic: ExportDiagnostic): ViewerDiagnosticEvent {
  return {
    category: 'exporter',
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    scope: 'exporter',
    detail: diagnostic.detail,
    cause: diagnostic.cause,
  }
}
