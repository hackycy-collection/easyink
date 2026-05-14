import type { MaterialNode } from '@easyink/schema'
import type { SvgCustomProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { escapeHtml } from '@easyink/shared'
import { sanitizeSvgContent } from './sanitize'

export function renderSvgCustom(node: MaterialNode) {
  const props = getNodeProps<SvgCustomProps>(node)
  const content = sanitizeSvgContent(props.content || '')

  return {
    html: trustedViewerHtml(`<svg viewBox="${escapeHtml(props.viewBox)}" preserveAspectRatio="${escapeHtml(props.preserveAspectRatio)}" style="width:100%;height:100%;display:block" fill="${escapeHtml(props.fillColor)}">${content}</svg>`, 'sanitized-rich-text'),
  }
}
