import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPagesToPdfBlob, resolveCanvasScale } from './pdf'

const pdfMocks = vi.hoisted(() => ({
  html2canvas: vi.fn(async () => ({
    width: 100,
    height: 100,
    toDataURL: () => 'data:image/png;base64,AA==',
  })),
  addPage: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
}))

vi.mock('html2canvas', () => ({
  default: pdfMocks.html2canvas,
}))

vi.mock('jspdf', () => {
  class JsPDF {
    addPage = pdfMocks.addPage
    addImage = pdfMocks.addImage
    output = pdfMocks.output
  }

  return {
    jsPDF: JsPDF,
  }
})

beforeEach(() => {
  pdfMocks.html2canvas.mockClear()
  pdfMocks.addPage.mockClear()
  pdfMocks.addImage.mockClear()
  pdfMocks.output.mockClear()
})

describe('resolveCanvasScale', () => {
  it('uses the requested dpi scale while the page stays under the pixel cap', () => {
    const page = document.createElement('div')
    page.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })

    expect(resolveCanvasScale(page, 300)).toBeCloseTo(300 / 96)
  })

  it('caps huge pages while preserving the minimum scale', () => {
    const page = document.createElement('div')
    page.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 10000,
      bottom: 10000,
      width: 10000,
      height: 10000,
      toJSON: () => ({}),
    })

    expect(resolveCanvasScale(page, 300)).toBe(2)
  })
})

describe('renderPagesToPdfBlob asset preflight', () => {
  it('continues and warns when an image never settles', async () => {
    const page = document.createElement('div')
    const image = document.createElement('img')
    image.src = 'https://example.test/hung.png'
    Object.defineProperty(image, 'complete', { configurable: true, value: false })
    page.appendChild(image)
    const diagnostics: string[] = []

    const result = await renderPagesToPdfBlob({
      pages: [page],
      widthMm: 80,
      heightMm: 60,
      assetLoadTimeoutMs: 1,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code)
      },
    })

    expect(result).toBeInstanceOf(Blob)
    expect(diagnostics).toContain('PDF_IMAGE_LOAD_TIMEOUT')
    expect(pdfMocks.html2canvas).toHaveBeenCalledTimes(1)
  })

  it('waits for CSS background images and continues on timeout', async () => {
    const page = document.createElement('div')
    page.style.backgroundImage = 'url("https://example.test/background.png")'
    const diagnostics: string[] = []

    const result = await renderPagesToPdfBlob({
      pages: [page],
      widthMm: 80,
      heightMm: 60,
      assetLoadTimeoutMs: 1,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code)
      },
    })

    expect(result).toBeInstanceOf(Blob)
    expect(diagnostics).toContain('PDF_BACKGROUND_IMAGE_LOAD_TIMEOUT')
    expect(pdfMocks.html2canvas).toHaveBeenCalledTimes(1)
  })
})
