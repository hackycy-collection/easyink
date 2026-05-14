import type { MaterialNode } from '@easyink/schema'
import type { SvgCustomProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { buildSvgCustomMarkup } from './rendering'

export function renderSvgCustom(node: MaterialNode) {
  const props = getNodeProps<SvgCustomProps>(node)

  return {
    html: trustedViewerHtml(buildSvgCustomMarkup(props), 'sanitized-rich-text'),
  }
}
