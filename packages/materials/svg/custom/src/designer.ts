import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { SvgCustomProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { buildSvgCustomMarkup } from './rendering'

export function createSvgCustomExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const node = nodeSignal.get()
        container.innerHTML = buildSvgCustomMarkup(getNodeProps<SvgCustomProps>(node))
      }

      render()
      return nodeSignal.subscribe(render)
    },
  }
}
