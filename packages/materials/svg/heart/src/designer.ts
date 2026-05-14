import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { SvgHeartProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { buildSvgHeartMarkup } from './rendering'
import { SVG_HEART_DEFAULTS } from './schema'

export function createSvgHeartExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const props = {
          ...SVG_HEART_DEFAULTS,
          ...getNodeProps<SvgHeartProps>(nodeSignal.get()),
        }
        container.innerHTML = buildSvgHeartMarkup(props)
      }

      render()
      return nodeSignal.subscribe(render)
    },
  }
}
