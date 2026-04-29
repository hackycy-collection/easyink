import type { Rect } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import { getBoundingRect } from '@easyink/core'

/**
 * Compute the bounding box of the given nodes using their visual height
 * (which may differ from `node.height` for materials with virtual content,
 * e.g. data-driven tables with placeholder rows).
 *
 * Returns `undefined` when the input list is empty.
 */
export function getSelectionBox(
  nodes: MaterialNode[],
  getVisualHeight: (n: MaterialNode) => number,
): Rect | undefined {
  if (nodes.length === 0)
    return undefined

  const rects: Rect[] = nodes.map(n => ({
    x: n.x,
    y: n.y,
    width: n.width,
    height: getVisualHeight(n),
  }))

  return getBoundingRect(rects)
}
