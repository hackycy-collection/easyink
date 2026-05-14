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

export type PrintDriverValue<T> = T | (() => T | undefined)

export interface PrintDriverRequestContext {
  printContext: ViewerPrintContext
  pages: HTMLElement[]
  widthMm: number
  heightMm: number
  printerName?: string
  copies?: number
  forcePageSize?: boolean
  landscape?: boolean
}

export interface PrintDriverBaseOptions<TClient, TRequestOptions> {
  client: TClient
  id?: string
  printerName?: PrintDriverValue<string>
  copies?: PrintDriverValue<number>
  forcePageSize?: PrintDriverValue<boolean>
  resolveRequestOptions?: (
    context: PrintDriverRequestContext,
  ) => Partial<TRequestOptions> | undefined | Promise<Partial<TRequestOptions> | undefined>
}

/**
 * Minimal printer shape shared by UI stores and transport-specific clients.
 */
export interface PrinterDeviceLike {
  name: string
  displayName?: string
  isDefault?: boolean
  status?: unknown
}

/**
 * Minimal print job shape shared across different print backends.
 */
export interface PrintJobLike {
  jobId: string
  status: string
  printerName?: string
  errorMessage?: string
}

/**
 * Normalized error type used by all EasyInk print packages.
 *
 * `code` is intended for application logic and UI diagnostics, while `message`
 * stays readable for operators.
 */
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

/**
 * Converts a Viewer dimension into millimeters so downstream drivers can work
 * against a single unit regardless of the document's source unit.
 */
export function toMillimeters(value: number, unit: string): number {
  const factor = UNIT_TO_MM[unit as keyof typeof UNIT_TO_MM] || 1
  return value * factor
}

/**
 * Resolves the effective print size from explicit print policy first and falls
 * back to the first rendered page when the policy does not provide one.
 */
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

/**
 * Resolves the effective Viewer print size in millimeters.
 */
export function resolveViewerPrintSize(context: ViewerPrintContext): { widthMm: number, heightMm: number } {
  const printSize = resolvePrintSize(context.printPolicy.sheetSize, context.renderedPages[0])
  return {
    widthMm: toMillimeters(printSize.width, printSize.unit),
    heightMm: toMillimeters(printSize.height, printSize.unit),
  }
}

/**
 * Maps Viewer orientation to an explicit landscape flag when possible.
 */
export function resolveExplicitPrintLandscape(
  orientation: ViewerPrintPolicy['orientation'],
): boolean | undefined {
  if (orientation === 'landscape')
    return true
  if (orientation === 'portrait')
    return false
  return undefined
}

/**
 * Resolves the final landscape flag. When orientation is `auto`, width and
 * height are used as the fallback heuristic.
 */
export function resolvePrintLandscape(
  orientation: ViewerPrintPolicy['orientation'],
  widthMm: number,
  heightMm: number,
): boolean {
  return resolveExplicitPrintLandscape(orientation) ?? widthMm > heightMm
}

/**
 * Converts Viewer print offsets to millimeters and omits zero offsets so
 * drivers can avoid sending redundant positioning information.
 */
export function resolvePrintOffset(
  offset: ViewerPrintPolicy['offset'],
): { x: number, y: number, unit: 'mm' } | undefined {
  const x = toMillimeters(offset.horizontal, offset.unit)
  const y = toMillimeters(offset.vertical, offset.unit)
  if (x === 0 && y === 0)
    return undefined
  return { x, y, unit: 'mm' }
}

/**
 * Returns rendered Viewer pages or throws a coded error when the container is
 * missing or nothing has been rendered yet.
 */
export function getViewerPages(container: HTMLElement | undefined): HTMLElement[] {
  if (!container)
    throw new EasyInkPrintError('找不到打印内容', 'PRINT_CONTAINER_MISSING')
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.ei-viewer-page'))
  if (pages.length === 0)
    throw new EasyInkPrintError('没有可输出的页面', 'PRINT_PAGES_MISSING')
  return pages
}

/**
 * Re-shapes export runtime diagnostics into Viewer diagnostics so driver code
 * can forward them without duplicating mapping logic.
 */
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

/**
 * Normalizes backend-specific job states to the shared set used by EasyInk UI
 * and polling logic.
 */
export function normalizeJobStatus(status: unknown): 'queued' | 'printing' | 'completed' | 'failed' | 'unknown' {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'queued' || normalized === 'printing' || normalized === 'completed' || normalized === 'failed')
    return normalized
  return 'unknown'
}

export function resolvePrintDriverValue<T>(value: PrintDriverValue<T> | undefined): T | undefined {
  return typeof value === 'function'
    ? (value as () => T | undefined)()
    : value
}
