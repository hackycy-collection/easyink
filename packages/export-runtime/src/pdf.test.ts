import { describe, expect, it } from 'vitest'
import { resolveCanvasScale } from './pdf'

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
