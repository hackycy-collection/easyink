import type { ViewerRenderContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLine(node: MaterialNode, context: ViewerRenderContext) {
  const p = node.props as unknown as LineProps
  const h = `${p.lineWidth}${context.unit}`

  let innerStyle: string
  if (p.lineType === 'dashed') {
    innerStyle = `width:100%;height:${h};background-image:repeating-linear-gradient(90deg,${p.lineColor} 0,${p.lineColor} 6px,transparent 6px,transparent 9px);print-color-adjust:exact;-webkit-print-color-adjust:exact;`
  }
  else if (p.lineType === 'dotted') {
    innerStyle = `width:100%;height:${h};background-image:repeating-linear-gradient(90deg,${p.lineColor} 0,${p.lineColor} 2px,transparent 2px,transparent 4px);print-color-adjust:exact;-webkit-print-color-adjust:exact;`
  }
  else {
    innerStyle = `width:100%;height:${h};background-color:${p.lineColor};print-color-adjust:exact;-webkit-print-color-adjust:exact;`
  }

  return {
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="${innerStyle}"></div></div>`,
  }
}
