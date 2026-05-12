import type { NormalizedDocumentSchema } from '@easyink/schema'
import type { ViewerPageMetrics, ViewerPrintOptions, ViewerPrintPolicy } from './types'

export interface ResolvePrintPolicyInput {
  schema: NormalizedDocumentSchema
  options?: ViewerPrintOptions
  renderedPages?: ViewerPageMetrics[]
}

export class PrintPolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PrintPolicyError'
  }
}

export function resolvePrintPolicy(input: ResolvePrintPolicyInput): ViewerPrintPolicy {
  const { schema, options = {}, renderedPages = [] } = input
  const { page, unit } = schema
  const requestedPageSizeMode = options.pageSizeMode ?? 'driver'
  const usesDriverPaper = page.mode === 'stack' && requestedPageSizeMode === 'driver'
  const orientation = page.print?.orientation ?? 'auto'

  const offset = {
    horizontal: page.print?.horizontalOffset ?? 0,
    vertical: page.print?.verticalOffset ?? 0,
    unit,
  }

  if (usesDriverPaper) {
    return {
      pageMode: page.mode,
      pageSizeMode: 'driver',
      orientation,
      pageBreakBehavior: { after: 'auto', inside: 'auto' },
      offset,
    }
  }

  if (page.mode === 'stack' && requestedPageSizeMode === 'fixed') {
    const firstPage = renderedPages[0]
    if (!firstPage) {
      throw new PrintPolicyError(
        'PRINT_RENDER_METRICS_MISSING',
        'Stack PDF printing requires rendered page metrics. Call render() before printing.',
      )
    }

    return {
      pageMode: page.mode,
      pageSizeMode: 'fixed',
      orientation,
      sheetSize: {
        width: firstPage.width,
        height: firstPage.height,
        unit: firstPage.unit,
        source: 'rendered',
      },
      pageBreakBehavior: { after: 'auto', inside: 'auto' },
      offset,
    }
  }

  let width = page.width
  let height = page.height
  let source: 'schema' | 'label' = 'schema'

  if (page.mode === 'label') {
    const columns = page.label?.columns || 1
    const rows = page.label?.rows || 1
    const gapX = page.label?.gap || 0
    const gapY = page.label?.rowGap || 0
    width = page.width * columns + gapX * Math.max(columns - 1, 0)
    height = page.height * rows + gapY * Math.max(rows - 1, 0)
    source = 'label'
  }

  return {
    pageMode: page.mode,
    pageSizeMode: 'fixed',
    orientation,
    sheetSize: { width, height, unit, source },
    pageBreakBehavior: {
      after: page.mode === 'stack' ? 'auto' : 'page',
      inside: page.mode === 'stack' ? 'auto' : 'avoid',
    },
    offset,
  }
}
