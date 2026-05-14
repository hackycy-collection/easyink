import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { SvgEllipseProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { buildSvgEllipseMarkup } from './rendering'
import { SVG_ELLIPSE_DEFAULTS } from './schema'

export function createSvgEllipseExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const props = {
          ...SVG_ELLIPSE_DEFAULTS,
          ...getNodeProps<SvgEllipseProps>(nodeSignal.get()),
        }
        container.innerHTML = buildSvgEllipseMarkup(props)
      }

      render()
      return nodeSignal.subscribe(render)
    },
  }
}
