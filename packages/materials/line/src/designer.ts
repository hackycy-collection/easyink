import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'

export function renderLineContent(node: MaterialNode): { html: string } {
  const p = node.props as unknown as LineProps
  const html = `<div style="position:absolute;top:50%;left:0;width:100%;border-top:${p.lineWidth}px ${p.lineType} ${p.lineColor};transform:translateY(-50%);"></div>`
  return { html }
}

export function getLineContextActions(_node: MaterialNode) {
  return []
}
