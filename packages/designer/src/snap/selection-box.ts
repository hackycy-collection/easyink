import type { Rect } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import { getBoundingRect, getRotatedAABB } from '@easyink/core'

/**
 * Compute the bounding box of the given nodes using schema element size.
 * Each node's contribution is its rotated AABB so rotated elements report
 * their true element extent.
 *
 * Returns `undefined` when the input list is empty.
 */
export function getSelectionBox(
  nodes: MaterialNode[],
  getElementSize: (n: MaterialNode) => { width: number, height: number },
): Rect | undefined {
  if (nodes.length === 0)
    return undefined

  const rects: Rect[] = nodes.map((n) => {
    const size = getElementSize(n)
    return getRotatedAABB(
      { x: n.x, y: n.y, width: size.width, height: size.height },
      n.rotation,
    )
  })

  return getBoundingRect(rects)
}
