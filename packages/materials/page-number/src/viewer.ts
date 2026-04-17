import type { ViewerRenderContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { PageNumberProps } from './schema'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderPageNumber(node: MaterialNode, context: ViewerRenderContext) {
  const props = node.props as unknown as PageNumberProps
  const resolved = context.resolvedProps

  const current = (resolved.__pageNumber as number) ?? 1
  const total = (resolved.__totalPages as number) ?? 1

  const display = escapeHtml(
    (props.format || '{current}/{total}')
      .replace(/\{current\}/g, String(current))
      .replace(/\{total\}/g, String(total)),
  )

  const vAlignMap: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }

  const outerStyle = [
    'width:100%;height:100%',
    'display:flex',
    `align-items:${vAlignMap[props.verticalAlign] || 'flex-start'}`,
    'box-sizing:border-box',
    'overflow:hidden',
    props.backgroundColor ? `background:${props.backgroundColor}` : '',
  ].filter(Boolean).join(';')

  const innerStyle = [
    'width:100%',
    `text-align:${props.textAlign}`,
    `font-size:${props.fontSize}pt`,
    props.fontFamily ? `font-family:${escapeHtml(props.fontFamily)}` : '',
    `font-weight:${props.fontWeight}`,
    `font-style:${props.fontStyle}`,
    `color:${props.color}`,
    `line-height:${props.lineHeight}`,
    props.letterSpacing ? `letter-spacing:${props.letterSpacing}pt` : '',
  ].filter(Boolean).join(';')

  return {
    html: `<div style="${outerStyle}"><span style="${innerStyle}">${display}</span></div>`,
  }
}
