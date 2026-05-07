import type { MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { TextProps } from './schema'
import { getNodeProps } from '@easyink/schema'
import { escapeHtml } from '@easyink/shared'
import { getTextContainerStyles, getTextContentStyles } from './rendering'

function buildHtml(node: MaterialNode, context: MaterialExtensionContext): string {
  const p = getNodeProps<TextProps>(node)
  const unit = context.getSchema().unit
  const prefix = p.prefix ? escapeHtml(p.prefix) : ''
  const suffix = p.suffix ? escapeHtml(p.suffix) : ''
  let isPlaceholder = false

  let display: string
  if (node.binding) {
    const b = Array.isArray(node.binding) ? node.binding[0] : node.binding
    const label = context.getBindingLabel(b)
    display = `${prefix}{#${escapeHtml(label)}}${suffix}`
  }
  else {
    if (p.content) {
      display = `${prefix}${escapeHtml(p.content)}${suffix}`
    }
    else {
      display = escapeHtml(context.t('designer.placeholder.textMaterialEmpty'))
      isPlaceholder = true
    }
  }

  const style = [
    ...getTextContainerStyles(p, unit),
    'position:relative',
  ].filter(Boolean).join(';')

  const textStyle = [
    ...getTextContentStyles({
      ...p,
      fontFamily: p.fontFamily ? escapeHtml(p.fontFamily) : '',
    }, unit),
    isPlaceholder ? 'opacity:0.45' : '',
  ].filter(Boolean).join(';')

  return `<div style="${style}"><span style="${textStyle}">${display || '&nbsp;'}</span></div>`
}

export function createTextExtension(context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        container.innerHTML = buildHtml(nodeSignal.get(), context)
      }
      render()
      const unsub = nodeSignal.subscribe(render)
      return unsub
    },
  }
}
