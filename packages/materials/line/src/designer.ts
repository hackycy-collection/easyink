import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { LineProps } from './schema'

function buildHtml(props: LineProps): string {
  return `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="width:100%;border-top:${props.lineWidth}px ${props.lineType} ${props.lineColor};"></div></div>`
}

export function createLineExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const node = nodeSignal.get()
        container.innerHTML = buildHtml(node.props as unknown as LineProps)
      }
      render()
      const unsub = nodeSignal.subscribe(render)
      return unsub
    },
  }
}
