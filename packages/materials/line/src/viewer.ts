import type { ViewerRenderContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

import { UNIT_FACTOR } from '@easyink/shared'
import { getLineThickness } from './schema'

const DASH_PATTERN = {
  dashed: { segment: 12, gap: 8 },
  dotted: { segment: 2, gap: 6 },
} as const

function getPxFactor(unit: string): number {
  const factor = UNIT_FACTOR[unit]
  if (!factor)
    return 1
  return 96 / factor
}

function buildRects(totalWidth: number, totalHeight: number, segmentWidth: number, gapWidth: number, color: string): string {
  const rects: string[] = []
  for (let x = 0; x < totalWidth; x += segmentWidth + gapWidth) {
    const width = Math.min(segmentWidth, totalWidth - x)
    rects.push(`<rect x="${x}" y="0" width="${width}" height="${totalHeight}" fill="${color}" />`)
  }
  return rects.join('')
}

function buildShapeMarkup(lineType: LineProps['lineType'] | undefined, widthPx: number, heightPx: number, color: string): string {
  if (lineType === 'dashed')
    return buildRects(widthPx, heightPx, DASH_PATTERN.dashed.segment, DASH_PATTERN.dashed.gap, color)
  if (lineType === 'dotted')
    return buildRects(widthPx, heightPx, DASH_PATTERN.dotted.segment, DASH_PATTERN.dotted.gap, color)
  return `<rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="${color}" />`
}

export function renderLine(node: MaterialNode, context: ViewerRenderContext) {
  const p = node.props as Partial<LineProps>
  const lineColor = p.lineColor || '#000000'
  const lineType = p.lineType || 'solid'
  const pxFactor = getPxFactor(context.unit)
  const widthPx = Math.max(1, node.width * pxFactor * context.zoom)
  const heightPx = Math.max(1, getLineThickness(node) * pxFactor * context.zoom)
  const content = buildShapeMarkup(lineType, widthPx, heightPx, lineColor)

  return {
    html: `<svg style="display:block;width:100%;height:100%;overflow:hidden;shape-rendering:crispEdges;" width="100%" height="100%" viewBox="0 0 ${widthPx} ${heightPx}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${content}</svg>`,
  }
}
