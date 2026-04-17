import type { MaterialNode } from '@easyink/schema'
import type { EllipseProps } from './schema'

export function renderEllipse(node: MaterialNode, unit = 'mm') {
  const props = node.props as unknown as EllipseProps
  return {
    html: `<svg style="width:100%;height:100%;overflow:visible;"><ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="${props.fillColor}" stroke="${props.borderColor}" stroke-width="${props.borderWidth}${unit}" ${props.borderType === 'dashed' ? 'stroke-dasharray="5,5"' : props.borderType === 'dotted' ? 'stroke-dasharray="2,2"' : ''} /></svg>`,
  }
}
