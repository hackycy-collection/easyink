import { toPixels } from '@easyink/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, provide, ref, render } from 'vue'
import { SelectionOverlay } from '../components/SelectionOverlay'
import { DESIGNER_INJECTION_KEY } from '../types'

function createContext() {
  const selectedElement = {
    id: 'el-1',
    layout: {
      height: 40,
      rotation: 0,
      width: 30,
      x: 10,
      y: 20,
    },
  }

  return {
    canvas: {
      zoom: ref(1),
    },
    engine: {
      schema: {
        schema: {
          page: {
            margins: {
              bottom: 0,
              left: 5,
              right: 0,
              top: 7,
            },
            unit: 'mm',
          },
        },
      },
    },
    interaction: {
      startDrag: vi.fn(),
      startResize: vi.fn(),
      startRotate: vi.fn(),
    },
    selection: {
      selectedElement: ref(selectedElement),
      selectedElements: ref([selectedElement]),
      selectedIds: ref(['el-1']),
      selectionBounds: ref(null),
    },
  } as any
}

function mountOverlay() {
  const container = document.createElement('div')
  container.className = 'easyink-canvas-page-wrapper'
  container.style.padding = '40px'
  document.body.appendChild(container)
  const ctx = createContext()

  const Root = defineComponent({
    setup() {
      provide(DESIGNER_INJECTION_KEY, ctx)
      return () => h(SelectionOverlay)
    },
  })

  render(h(Root), container)

  return { container, ctx }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('selectionOverlay', () => {
  it('offsets the overlay to the page content area', () => {
    const { container } = mountOverlay()
    const overlay = container.querySelector('.easyink-selection-overlay') as HTMLElement
    const box = container.querySelector('.easyink-selection-box') as HTMLElement

    expect(Number.parseFloat(overlay.style.left)).toBeCloseTo(40 + toPixels(5, 'mm', 96, 1))
    expect(Number.parseFloat(overlay.style.top)).toBeCloseTo(40 + toPixels(7, 'mm', 96, 1))
    expect(Number.parseFloat(box.style.left)).toBeCloseTo(toPixels(10, 'mm', 96, 1))
    expect(Number.parseFloat(box.style.top)).toBeCloseTo(toPixels(20, 'mm', 96, 1))
  })

  it('uses the selection box rect as rotation center', () => {
    const { container, ctx } = mountOverlay()
    const box = container.querySelector('.easyink-selection-box') as HTMLElement
    const zone = container.querySelector('.easyink-rotation-zone--top-left') as HTMLElement

    box.getBoundingClientRect = vi.fn(() => ({
      bottom: 600,
      height: 400,
      left: 100,
      right: 400,
      top: 200,
      width: 300,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    })) as any

    zone.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(ctx.interaction.startRotate).toHaveBeenCalledTimes(1)
    expect(ctx.interaction.startRotate).toHaveBeenCalledWith(
      'el-1',
      expect.any(MouseEvent),
      250,
      400,
    )
  })
})
