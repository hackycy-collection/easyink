import type { MaterialNode } from '@easyink/schema'
import type { SvgHeartProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { buildSvgHeartMarkup } from './rendering'
import { SVG_HEART_DEFAULTS } from './schema'

export function renderSvgHeart(node: MaterialNode, unit = 'mm') {
  const props = {
    ...SVG_HEART_DEFAULTS,
    ...getNodeProps<SvgHeartProps>(node),
  }
  return {
    html: trustedViewerHtml(buildSvgHeartMarkup(props, unit), 'sanitized-rich-text'),
  }
}
