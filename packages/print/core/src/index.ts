import type { ExportDiagnostic } from '@easyink/export-runtime'
import type { ViewerDiagnosticEvent, ViewerPageMetrics, ViewerPrintContext, ViewerPrintPolicy, ViewerPrintSheetSize } from '@easyink/viewer'

const UNIT_TO_MM = {
  cm: 10,
  in: 25.4,
  inch: 25.4,
  mm: 1,
  pt: 0.352778,
  px: 25.4 / 96,
} as const

export type PrintConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

export interface PrinterDeviceLike {
  name: string
  displayName?: string
  isDefault?: boolean
  status?: unknown
}

export interface PrintJobLike {
  jobId: string
  status: string
  printerName?: string
  errorMessage?: string
}

export class EasyInkPrintError extends Error {
  constructor(
    message: string,
    public readonly code = 'EASYINK_PRINT_ERROR',
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'EasyInkPrintError'
  }
}

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
  throw new EasyInkPrintError('缺少打印页面尺寸', 'PRINT_SIZE_MISSING')
}

export function resolveViewerPrintSize(context: ViewerPrintContext): { widthMm: number, heightMm: number } {
  const printSize = resolvePrintSize(context.printPolicy.sheetSize, context.renderedPages[0])
  return {
    widthMm: toMillimeters(printSize.width, printSize.unit),
    heightMm: toMillimeters(printSize.height, printSize.unit),
  }
}

export function resolveExplicitPrintLandscape(
  orientation: ViewerPrintPolicy['orientation'],
): boolean | undefined {
  if (orientation === 'landscape')
    return true
  if (orientation === 'portrait')
    return false
  return undefined
}

export function resolvePrintLandscape(
  orientation: ViewerPrintPolicy['orientation'],
  widthMm: number,
  heightMm: number,
): boolean {
  return resolveExplicitPrintLandscape(orientation) ?? widthMm > heightMm
}

export function resolvePrintOffset(
  offset: ViewerPrintPolicy['offset'],
): { x: number, y: number, unit: 'mm' } | undefined {
  const x = toMillimeters(offset.horizontal, offset.unit)
  const y = toMillimeters(offset.vertical, offset.unit)
  if (x === 0 && y === 0)
    return undefined
  return { x, y, unit: 'mm' }
}

export function getViewerPages(container: HTMLElement | undefined): HTMLElement[] {
  if (!container)
    throw new EasyInkPrintError('找不到打印内容', 'PRINT_CONTAINER_MISSING')
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.ei-viewer-page'))
  if (pages.length === 0)
    throw new EasyInkPrintError('没有可输出的页面', 'PRINT_PAGES_MISSING')
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

export function normalizeJobStatus(status: unknown): 'queued' | 'printing' | 'completed' | 'failed' | 'unknown' {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'queued' || normalized === 'printing' || normalized === 'completed' || normalized === 'failed')
    return normalized
  return 'unknown'
}
