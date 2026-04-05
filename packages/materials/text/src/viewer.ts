import type { MaterialNode } from '@easyink/schema'
import type { TextProps } from './schema'

export function renderText(node: MaterialNode, _data?: Record<string, unknown>) {
  const props = node.props as unknown as TextProps
  const content = props.content || ''
  const prefix = props.prefix || ''
  const suffix = props.suffix || ''
  const displayText = `${prefix}${content}${suffix}`

  return {
    html: `<div style="
      font-size: ${props.fontSize}pt;
      font-family: ${props.fontFamily || 'inherit'};
      font-weight: ${props.fontWeight};
      font-style: ${props.fontStyle};
      color: ${props.color};
      background: ${props.backgroundColor || 'transparent'};
      text-align: ${props.textAlign};
      line-height: ${props.lineHeight};
      letter-spacing: ${props.letterSpacing}pt;
      overflow: ${props.overflow === 'ellipsis' ? 'hidden' : props.overflow};
      text-overflow: ${props.overflow === 'ellipsis' ? 'ellipsis' : 'clip'};
      white-space: ${props.autoWrap ? 'normal' : 'nowrap'};
      word-wrap: ${props.autoWrap ? 'break-word' : 'normal'};
      width: 100%;
      height: 100%;
    ">${escapeHtml(displayText)}</div>`,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
