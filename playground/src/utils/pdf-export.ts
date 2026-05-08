import html2canvas from 'html2canvas'
import { jsPDF as JsPDF } from 'jspdf'

const CSS_DPI = 96
const DEFAULT_EXPORT_DPI = 300
const MIN_CANVAS_SCALE = 2
const MAX_CANVAS_PIXELS = 32000000

export interface RenderPagesToPdfOptions {
  pages: HTMLElement[]
  widthMm: number
  heightMm: number
  dpi?: number
  onPageStart?: (pageIndex: number, totalPages: number) => void
}

export async function renderPagesToPdfBlob(options: RenderPagesToPdfOptions): Promise<Blob> {
  const { pages, widthMm, heightMm, dpi = DEFAULT_EXPORT_DPI, onPageStart } = options
  const orientation = widthMm > heightMm ? 'landscape' : 'portrait'
  const pdf = new JsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm], compress: false })

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]!
    onPageStart?.(pageIndex, pages.length)
    const captureId = `easyink-pdf-capture-${pageIndex}`
    page.setAttribute('data-easyink-pdf-capture-id', captureId)

    try {
      await waitForRenderableAssets(page)

      if (pageIndex > 0)
        pdf.addPage([widthMm, heightMm], orientation)

      const canvas = await html2canvas(page, {
        scale: resolveCanvasScale(page, dpi),
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

function resolveCanvasScale(page: HTMLElement, dpi: number): number {
  const targetScale = Math.max(MIN_CANVAS_SCALE, dpi / CSS_DPI)
  const rect = page.getBoundingClientRect()
  const estimatedPixels = rect.width * rect.height * targetScale * targetScale
  if (estimatedPixels <= MAX_CANVAS_PIXELS)
    return targetScale
  return Math.max(MIN_CANVAS_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / (rect.width * rect.height)))
}

async function waitForRenderableAssets(root: HTMLElement): Promise<void> {
  const fonts = root.ownerDocument.fonts
  if (fonts)
    await fonts.ready

  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(image => waitForImage(image)))
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete)
    return Promise.resolve()

  return new Promise((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })
}
