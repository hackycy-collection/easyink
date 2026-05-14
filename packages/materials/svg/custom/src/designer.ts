import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { SvgCustomProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { escapeHtml } from '@easyink/shared'
import { sanitizeSvgContent } from './sanitize'

function buildSvgMarkup(props: SvgCustomProps): string {
  if (!props.content) {
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:1px dashed #d0d0d0;box-sizing:border-box">`
      + `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">`
      + `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>`
      + `</svg></div>`
  }

  const content = sanitizeSvgContent(props.content)
  return `<svg width="100%" height="100%" viewBox="${escapeHtml(props.viewBox)}" preserveAspectRatio="${escapeHtml(props.preserveAspectRatio)}" xmlns="http://www.w3.org/2000/svg" fill="${escapeHtml(props.fillColor)}">${content}</svg>`
}

export function createSvgCustomExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const node = nodeSignal.get()
        container.innerHTML = buildSvgMarkup(getNodeProps<SvgCustomProps>(node))
      }

      render()
      return nodeSignal.subscribe(render)
    },
  }
}
