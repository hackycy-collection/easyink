import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCanvasContentMetrics } from '../utils/canvas-metrics'

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

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('canvas metrics', () => {
  it('measures rendered content offsets from the page wrapper', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'easyink-canvas-page-wrapper'
    wrapper.style.padding = '40px'

    const content = document.createElement('div')
    content.className = 'easyink-content'
    wrapper.appendChild(content)
    document.body.appendChild(wrapper)

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 500,
      left: 100,
      top: 80,
      width: 700,
    }))
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 260,
      left: 168,
      top: 132,
      width: 420,
    }))

    const metrics = getCanvasContentMetrics({
      contentHeight: 0,
      contentWidth: 0,
      marginOffsetX: 20,
      marginOffsetY: 30,
    })

    expect(metrics.offsetX).toBe(68)
    expect(metrics.offsetY).toBe(52)
    expect(metrics.originClientX).toBe(168)
    expect(metrics.originClientY).toBe(132)
    expect(metrics.contentWidth).toBe(420)
    expect(metrics.contentHeight).toBe(260)
  })

  it('falls back to wrapper padding and margin offsets before content is rendered', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'easyink-canvas-page-wrapper'
    wrapper.style.paddingLeft = '12px'
    wrapper.style.paddingTop = '18px'
    document.body.appendChild(wrapper)

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(mockRect({
      height: 300,
      left: 40,
      top: 50,
      width: 500,
    }))

    const metrics = getCanvasContentMetrics({
      contentHeight: 240,
      contentWidth: 360,
      marginOffsetX: 24,
      marginOffsetY: 36,
    })

    expect(metrics.offsetX).toBe(36)
    expect(metrics.offsetY).toBe(54)
    expect(metrics.originClientX).toBe(76)
    expect(metrics.originClientY).toBe(104)
    expect(metrics.contentWidth).toBe(360)
    expect(metrics.contentHeight).toBe(240)
  })
})
