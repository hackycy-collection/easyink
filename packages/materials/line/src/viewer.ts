import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLine(node: MaterialNode) {
  const p = node.props as unknown as LineProps
  return {
    html: `<div style="position:absolute;top:50%;left:0;width:100%;border-top:${p.lineWidth}px ${p.lineType} ${p.lineColor};transform:translateY(-50%);"></div>`,
  }
}
