import type { MaterialNode } from '@easyink/schema'
import type { SvgEllipseProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { buildSvgEllipseMarkup } from './rendering'
import { SVG_ELLIPSE_DEFAULTS } from './schema'

export function renderSvgEllipse(node: MaterialNode, unit = 'mm') {
  const props = {
    ...SVG_ELLIPSE_DEFAULTS,
    ...getNodeProps<SvgEllipseProps>(node),
  }
  return {
    html: trustedViewerHtml(buildSvgEllipseMarkup(props, unit), 'sanitized-rich-text'),
  }
}
