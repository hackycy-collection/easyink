export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/**
 * Check if two rectangles intersect.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x
    || b.x + b.width <= a.x
    || a.y + a.height <= b.y
    || b.y + b.height <= a.y
  )
}

/**
 * Check if rectangle `inner` is fully contained within `outer`.
 */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height
  )
}

/**
 * Check if a point is inside a rectangle.
 */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  )
}

/**
 * Get the bounding box of multiple rectangles.
 */
export function getBoundingRect(rects: Rect[]): Rect | undefined {
  if (rects.length === 0)
    return undefined

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const r of rects) {
    if (r.x < minX)
      minX = r.x
    if (r.y < minY)
      minY = r.y
    if (r.x + r.width > maxX)
      maxX = r.x + r.width
    if (r.y + r.height > maxY)
      maxY = r.y + r.height
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate distance between two points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Normalize a rotation to [0, 360).
 */
export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/**
 * Snap a value to the nearest grid step.
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0)
    return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap a value to the nearest guide, if within threshold.
 */
export function snapToGuide(value: number, guides: number[], threshold: number): number | undefined {
  let best: number | undefined
  let bestDist = threshold

  for (const guide of guides) {
    const dist = Math.abs(value - guide)
    if (dist < bestDist) {
      bestDist = dist
      best = guide
    }
  }

  return best
}
