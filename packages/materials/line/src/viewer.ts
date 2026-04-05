import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLine(node: MaterialNode) {
  const props = node.props as unknown as LineProps
  const dashArray = props.lineType === 'dashed' ? '5,5' : props.lineType === 'dotted' ? '2,2' : ''
  return {
    html: `<svg style="width:100%;height:100%;overflow:visible;"><line x1="${props.startX}" y1="${props.startY}" x2="${props.endX}" y2="${props.endY}" stroke="${props.lineColor}" stroke-width="${props.lineWidth}" ${dashArray ? `stroke-dasharray="${dashArray}"` : ''} /></svg>`,
  }
}
