import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, provide, ref, render } from 'vue'
import { RulerHorizontal } from '../components/RulerHorizontal'
import { RulerVertical } from '../components/RulerVertical'
import { DESIGNER_INJECTION_KEY } from '../types'

function mockRect(rect: Partial<DOMRect>): DOMRect {
  return {
    bottom: rect.bottom ?? 0,
    height: rect.height ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? 0,
    top: rect.top ?? 0,
    width: rect.width ?? 0,
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    toJSON: () => ({}),
  } as DOMRect
}

function createContext() {
  return {
    canvas: {
      panX: ref(0),
      panY: ref(0),
      renderVersion: ref(1),
      zoom: ref(2),
    },
    engine: {
      layout: {
        resolvePageDimensions: vi.fn(() => ({ height: 210, width: 297 })),
      },
      schema: {
        schema: {
          page: {
            margins: {
              bottom: 12,
              left: 10,
              right: 15,
              top: 8,
            },
            unit: 'mm',
          },
        },
      },
    },
    guides: {
      addGuide: vi.fn(),
      clearPreview: vi.fn(),
      setPreview: vi.fn(),
    },
  } as any
}

function mountRuler(component: typeof RulerHorizontal | typeof RulerVertical) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const ctx = createContext()

  const Root = defineComponent({
    setup() {
      provide(DESIGNER_INJECTION_KEY, ctx)
      return () => h(component)
    },
  })

  render(h(Root), host)
  return { ctx, host }
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as any)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ruler', () => {
  it('maps horizontal hover and click to content-origin coordinates under zoom', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'easyink-canvas-page-wrapper'
    wrapper.style.padding = '40px'
    const content = document.createElement('div')
    content.className = 'easyink-content'
    wrapper.appendChild(content)
    document.body.appendChild(wrapper)

    const { ctx, host } = mountRuler(RulerHorizontal)
    const canvas = host.querySelector('canvas') as HTMLCanvasElement

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 24,
      left: 20,
      top: 0,
      width: 900,
    }))
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 700,
      left: 60,
      top: 90,
      width: 1200,
    }))
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 420,
      left: 136,
      top: 154,
      width: 780,
    }))

    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 236 }))
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 236 }))

    const preview = ctx.guides.setPreview.mock.calls[0][0]
    expect(preview.orientation).toBe('vertical')
    expect(preview.position).toBeCloseTo(13.229, 3)

    const guide = ctx.guides.addGuide.mock.calls[0]
    expect(guide[0]).toBe('vertical')
    expect(guide[1]).toBeCloseTo(13.229, 3)
  })

  it('maps vertical hover and click to content-origin coordinates under zoom', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'easyink-canvas-page-wrapper'
    wrapper.style.padding = '40px'
    const content = document.createElement('div')
    content.className = 'easyink-content'
    wrapper.appendChild(content)
    document.body.appendChild(wrapper)

    const { ctx, host } = mountRuler(RulerVertical)
    const canvas = host.querySelector('canvas') as HTMLCanvasElement

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 900,
      left: 0,
      top: 30,
      width: 24,
    }))
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 1200,
      left: 70,
      top: 80,
      width: 700,
    }))
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 860,
      left: 146,
      top: 150,
      width: 420,
    }))

    canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 250 }))
    canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: 250 }))

    const preview = ctx.guides.setPreview.mock.calls[0][0]
    expect(preview.orientation).toBe('horizontal')
    expect(preview.position).toBeCloseTo(13.229, 3)

    const guide = ctx.guides.addGuide.mock.calls[0]
    expect(guide[0]).toBe('horizontal')
    expect(guide[1]).toBeCloseTo(13.229, 3)
  })
})
