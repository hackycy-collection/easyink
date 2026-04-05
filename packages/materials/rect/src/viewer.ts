import type { MaterialNode } from '@easyink/schema'
import type { RectProps } from './schema'

export function renderRect(node: MaterialNode) {
  const props = node.props as unknown as RectProps
  return {
    html: `<div style="width:100%;height:100%;background:${props.fillColor};border:${props.borderWidth}px ${props.borderType} ${props.borderColor};border-radius:${props.borderRadius}px;box-sizing:border-box;"></div>`,
  }
}
