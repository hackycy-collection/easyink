import type { jsPDF as JsPDFType } from 'jspdf'
import type { ExportDiagnostic, ExportProgress, ExportRuntimeAdapter } from './types'

const CSS_DPI = 96
const DEFAULT_EXPORT_DPI = 300
const MIN_CANVAS_SCALE = 2
const MAX_CANVAS_PIXELS = 32000000

export interface RenderPagesToPdfOptions {
  pages: HTMLElement[]
  widthMm: number
  heightMm: number
  dpi?: number
  onProgress?: (progress: ExportProgress) => void
  onDiagnostic?: (diagnostic: ExportDiagnostic) => void
}

export interface DomPdfExportInput {
  pages: HTMLElement[]
  widthMm: number
  heightMm: number
  dpi?: number
}

export interface DomPdfExportAdapterOptions {
  id?: string
  format?: string
}

export function createDomPdfExportAdapter(options: DomPdfExportAdapterOptions = {}): ExportRuntimeAdapter<DomPdfExportInput, Blob> {
  return {
    id: options.id ?? 'dom-pdf-export',
    format: options.format ?? 'pdf',
    async export(context) {
      return renderPagesToPdfBlob({
        ...context.input,
        onProgress: context.reportProgress,
        onDiagnostic: context.emitDiagnostic,
      })
    },
  }
}

export async function renderPagesToPdfBlob(options: RenderPagesToPdfOptions): Promise<Blob> {
  const { pages, widthMm, heightMm, dpi = DEFAULT_EXPORT_DPI, onProgress, onDiagnostic } = options
  const [{ default: html2canvas }, { jsPDF: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const orientation = widthMm > heightMm ? 'landscape' : 'portrait'
  const pdf = new JsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm], compress: false })

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]!
    onProgress?.({ current: pageIndex + 1, total: pages.length, message: `render-page:${pageIndex + 1}` })
    const captureId = `easyink-pdf-capture-${pageIndex}`
    page.setAttribute('data-easyink-pdf-capture-id', captureId)

    try {
      await waitForRenderableAssets(page, onDiagnostic)

      if (pageIndex > 0)
        pdf.addPage([widthMm, heightMm], orientation)

      const canvas = await html2canvas(page, {
        scale: resolveCanvasScale(page, dpi),
        foreignObjectRendering: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDocument) => {
          normalizeClonedCaptureDocument(clonedDocument, captureId)
        },
      })

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm, undefined, 'NONE')
      canvas.width = 0
      canvas.height = 0
    }
    finally {
      page.removeAttribute('data-easyink-pdf-capture-id')
    }
  }

  return pdf.output('blob')
}

function normalizeClonedCaptureDocument(clonedDocument: Document, captureId: string): void {
  const page = clonedDocument.querySelector<HTMLElement>(`[data-easyink-pdf-capture-id="${captureId}"]`)
  if (!page)
    return

  page.style.margin = '0'
  page.style.boxShadow = 'none'
  page.style.transform = 'none'
  page.style.transformOrigin = 'top left'
  page.style.overflow = 'hidden'
  page.style.backgroundColor = page.style.backgroundColor || '#ffffff'

  const mount = page.closest<HTMLElement>('#easyink-viewer-root')
  if (mount) {
    mount.style.padding = '0'
    mount.style.background = '#ffffff'
  }

  clonedDocument.documentElement.style.background = '#ffffff'
  clonedDocument.body.style.margin = '0'
  clonedDocument.body.style.background = '#ffffff'
}

export function resolveCanvasScale(page: HTMLElement, dpi: number): number {
  const targetScale = Math.max(MIN_CANVAS_SCALE, dpi / CSS_DPI)
  const rect = page.getBoundingClientRect()
  const estimatedPixels = rect.width * rect.height * targetScale * targetScale
  if (estimatedPixels <= MAX_CANVAS_PIXELS)
    return targetScale
  return Math.max(MIN_CANVAS_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / (rect.width * rect.height)))
}

async function waitForRenderableAssets(
  root: HTMLElement,
  onDiagnostic: ((diagnostic: ExportDiagnostic) => void) | undefined,
): Promise<void> {
  const fonts = root.ownerDocument.fonts
  if (fonts) {
    try {
      await fonts.ready
    }
    catch (err) {
      onDiagnostic?.({
        severity: 'warning',
        code: 'PDF_FONT_READY_FAILED',
        message: 'Font readiness check failed before PDF export; export will continue with current font state.',
        scope: 'asset',
        cause: serializeCause(err),
      })
    }
  }

  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(image => waitForImage(image, onDiagnostic)))
}

function waitForImage(
  image: HTMLImageElement,
  onDiagnostic: ((diagnostic: ExportDiagnostic) => void) | undefined,
): Promise<void> {
  if (image.complete) {
    if (image.currentSrc && image.naturalWidth === 0)
      emitImageWarning(image, onDiagnostic)
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    image.addEventListener('load', () => {
      resolve()
    }, { once: true })
    image.addEventListener('error', () => {
      emitImageWarning(image, onDiagnostic)
      resolve()
    }, { once: true })
  })
}

function emitImageWarning(
  image: HTMLImageElement,
  onDiagnostic: ((diagnostic: ExportDiagnostic) => void) | undefined,
): void {
  onDiagnostic?.({
    severity: 'warning',
    code: 'PDF_IMAGE_LOAD_FAILED',
    message: 'Image failed to load before PDF export; export will continue without blocking.',
    scope: 'asset',
    detail: { src: image.currentSrc || image.src || image.alt || '' },
  })
}

function serializeCause(err: unknown): unknown {
  if (err instanceof Error)
    return { name: err.name, message: err.message, stack: err.stack }
  return err
}

export type JsPDF = JsPDFType
