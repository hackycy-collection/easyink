import type { MaterialNode } from '@easyink/schema'
import type { TextProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { escapeHtml } from '@easyink/shared'
import { getTextContainerStyles, getTextContentStyles } from './rendering'

export function renderText(node: MaterialNode, _data?: Record<string, unknown>, unit = 'mm') {
  const props = getNodeProps<TextProps>(node)
  const prefix = props.prefix ? escapeHtml(props.prefix) : ''
  const suffix = props.suffix ? escapeHtml(props.suffix) : ''
  const raw = props.content || ''
  const displayText = escapeHtml(raw)
  const display = `${prefix}${displayText}${suffix}`

  const outerStyle = [
    ...getTextContainerStyles(props, unit),
  ].filter(Boolean).join(';')

  const innerStyle = [
    ...getTextContentStyles({
      ...props,
      fontFamily: props.fontFamily ? escapeHtml(props.fontFamily) : '',
    }, unit),
  ].filter(Boolean).join(';')

  return {
    html: `<div style="${outerStyle}"><span style="${innerStyle}">${display || '&nbsp;'}</span></div>`,
  }
}
