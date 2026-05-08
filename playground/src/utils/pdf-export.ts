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
    const capture = preparePageCapture(page, widthMm, heightMm)

    try {
      await waitForRenderableAssets(capture.page)

      if (pageIndex > 0)
        pdf.addPage([widthMm, heightMm], orientation)

      const rect = capture.page.getBoundingClientRect()
      const canvas = await html2canvas(capture.page, {
        scale: resolveCanvasScale(capture.page, dpi),
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
        removeContainer: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.ceil(rect.width),
        windowHeight: Math.ceil(rect.height),
      })

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm, undefined, 'NONE')
      canvas.width = 0
      canvas.height = 0
    }
    finally {
      capture.cleanup()
    }
  }

  return pdf.output('blob')
}

function preparePageCapture(
  page: HTMLElement,
  widthMm: number,
  heightMm: number,
): { page: HTMLElement, cleanup: () => void } {
  const doc = page.ownerDocument
  const sandbox = doc.createElement('div')
  sandbox.setAttribute('data-easyink-pdf-capture', '')
  sandbox.style.position = 'fixed'
  sandbox.style.left = '-100000px'
  sandbox.style.top = '0'
  sandbox.style.width = `${widthMm}mm`
  sandbox.style.height = `${heightMm}mm`
  sandbox.style.margin = '0'
  sandbox.style.padding = '0'
  sandbox.style.overflow = 'hidden'
  sandbox.style.background = '#ffffff'
  sandbox.style.boxSizing = 'border-box'
  sandbox.style.pointerEvents = 'none'
  sandbox.style.zIndex = '-1'

  const clone = page.cloneNode(true) as HTMLElement
  normalizeCapturePage(clone, widthMm, heightMm)
  sandbox.appendChild(clone)
  doc.body.appendChild(sandbox)

  return {
    page: clone,
    cleanup: () => sandbox.remove(),
  }
}

function normalizeCapturePage(page: HTMLElement, widthMm: number, heightMm: number): void {
  page.style.width = `${widthMm}mm`
  page.style.height = `${heightMm}mm`
  page.style.margin = '0'
  page.style.boxShadow = 'none'
  page.style.transform = 'none'
  page.style.transformOrigin = 'top left'
  page.style.overflow = 'hidden'
  page.style.backgroundColor = page.style.backgroundColor || '#ffffff'
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
