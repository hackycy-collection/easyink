import type { EllipseProps } from './schema'

const BORDER_STYLE_MAP: Record<EllipseProps['borderType'], string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
}

export function buildEllipseSvg(props: EllipseProps, unit: string): string {
  const borderWidth = props.borderWidth || 0
  const borderColor = props.borderColor || 'transparent'
  const borderStyle = BORDER_STYLE_MAP[props.borderType] || 'solid'
  const border = borderWidth > 0
    ? `border:${borderWidth}${unit} ${borderStyle} ${borderColor};`
    : ''

  return `<div style="width:100%;height:100%;box-sizing:border-box;border-radius:50%;background:${props.fillColor || 'transparent'};${border}"></div>`
}
