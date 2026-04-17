import type { ViewerRenderContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLine(node: MaterialNode, context: ViewerRenderContext) {
  const p = node.props as unknown as LineProps
  const lw = `${p.lineWidth}${context.unit}`
  return {
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="width:100%;border-top:${lw} ${p.lineType} ${p.lineColor};"></div></div>`,
  }
}
