import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLine(node: MaterialNode) {
  const p = node.props as unknown as LineProps
  return {
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="width:100%;border-top:${p.lineWidth}px ${p.lineType} ${p.lineColor};"></div></div>`,
  }
}
