import { describe, expect, it } from 'vitest'
import { distance, getBoundingRect, normalizeRotation, pointInRect, rectContains, rectsIntersect, snapToGrid, snapToGuide } from './geometry'

describe('rectsIntersect', () => {
  it('detects overlapping rectangles', () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(true)
  })

  it('detects non-overlapping rectangles', () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
    )).toBe(false)
  })

  it('touching edges do not intersect', () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false)
  })
})

describe('rectContains', () => {
  it('inner fully inside outer', () => {
    expect(rectContains(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 10, y: 10, width: 20, height: 20 },
    )).toBe(true)
  })

  it('inner partially outside outer', () => {
    expect(rectContains(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 90, y: 90, width: 20, height: 20 },
    )).toBe(false)
  })
})

describe('pointInRect', () => {
  it('detects point inside', () => {
    expect(pointInRect({ x: 5, y: 5 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true)
  })

  it('detects point outside', () => {
    expect(pointInRect({ x: 15, y: 15 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false)
  })

  it('point on edge is inside', () => {
    expect(pointInRect({ x: 0, y: 0 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true)
  })
})

describe('getBoundingRect', () => {
  it('computes bounding box of multiple rects', () => {
    const result = getBoundingRect([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
    ])
    expect(result).toEqual({ x: 0, y: 0, width: 30, height: 30 })
  })

  it('returns undefined for empty array', () => {
    expect(getBoundingRect([])).toBeUndefined()
  })
})

describe('distance', () => {
  it('calculates distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })
})

describe('normalizeRotation', () => {
  it('normalizes negative rotation', () => {
    expect(normalizeRotation(-90)).toBe(270)
  })

  it('normalizes > 360', () => {
    expect(normalizeRotation(450)).toBe(90)
  })

  it('keeps 0 as 0', () => {
    expect(normalizeRotation(0)).toBe(0)
  })
})

describe('snapToGrid', () => {
  it('snaps to nearest grid step', () => {
    expect(snapToGrid(7, 5)).toBe(5)
    expect(snapToGrid(8, 5)).toBe(10)
  })

  it('returns value when gridSize is 0', () => {
    expect(snapToGrid(7, 0)).toBe(7)
  })
})

describe('snapToGuide', () => {
  it('snaps to nearest guide within threshold', () => {
    expect(snapToGuide(12, [10, 20, 30], 5)).toBe(10)
  })

  it('returns undefined if no guide within threshold', () => {
    expect(snapToGuide(50, [10, 20, 30], 5)).toBeUndefined()
  })
})
