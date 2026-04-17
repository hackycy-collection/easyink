import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { LineProps } from './schema'
import { getLineThickness } from './schema'

function buildHtml(node: MaterialNode): string {
  const props = node.props as Partial<LineProps>
  const lineColor = props.lineColor || '#000000'
  const lineType = props.lineType || 'solid'
  let fillStyle = `background-color:${lineColor};`
  if (lineType === 'dashed') {
    fillStyle = `background-image:repeating-linear-gradient(90deg,${lineColor} 0,${lineColor} 12px,transparent 12px,transparent 20px);`
  }
  else if (lineType === 'dotted') {
    fillStyle = `background-image:repeating-linear-gradient(90deg,${lineColor} 0,${lineColor} 2px,transparent 2px,transparent 8px);`
  }

  return `<div style="position:relative;width:100%;height:100%;overflow:visible;"><div style="position:absolute;inset:0;${fillStyle}"></div></div>`
}

export function createLineExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const node = nodeSignal.get()
        container.innerHTML = buildHtml(node)
      }
      render()
      const unsub = nodeSignal.subscribe(render)
      return unsub
    },
    getVisualHeight(node) {
      return getLineThickness(node)
    },
  }
}
