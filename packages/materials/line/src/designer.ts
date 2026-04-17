import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { LineProps } from './schema'

function buildHtml(props: LineProps): string {
  const h = `${props.lineWidth}px`
  let innerStyle: string
  if (props.lineType === 'dashed') {
    innerStyle = `width:100%;height:${h};background-image:repeating-linear-gradient(90deg,${props.lineColor} 0,${props.lineColor} 6px,transparent 6px,transparent 9px);`
  }
  else if (props.lineType === 'dotted') {
    innerStyle = `width:100%;height:${h};background-image:repeating-linear-gradient(90deg,${props.lineColor} 0,${props.lineColor} 2px,transparent 2px,transparent 4px);`
  }
  else {
    innerStyle = `width:100%;height:${h};background-color:${props.lineColor};`
  }
  return `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="${innerStyle}"></div></div>`
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
