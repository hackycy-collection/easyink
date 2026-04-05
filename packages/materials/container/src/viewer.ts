import type { MaterialNode } from '@easyink/schema'
import type { ContainerProps } from './schema'

export function renderContainer(node: MaterialNode) {
  const props = node.props as unknown as ContainerProps
  const border = props.borderWidth > 0
    ? `border:${props.borderWidth}px ${props.borderType} ${props.borderColor};`
    : ''
  return {
    html: `<div style="width:100%;height:100%;display:flex;flex-direction:${props.direction};gap:${props.gap}px;padding:${props.padding}px;background:${props.fillColor};${border}box-sizing:border-box;"></div>`,
  }
}
