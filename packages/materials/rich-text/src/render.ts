import type { MaterialRenderFunction } from '@easyink/renderer'

interface RichTextProps {
  content: string
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

export const renderRichText: MaterialRenderFunction = (node, context) => {
  const el = document.createElement('div')
  el.className = 'easyink-material easyink-rich-text'
  el.dataset.materialId = node.id

  const props = node.props as unknown as RichTextProps

  let content: string = props.content ?? ''

  if (node.binding?.path) {
    if (context.designMode) {
      content = `{{${node.binding.path}}}`
      el.style.color = '#999'
      el.style.borderBottom = '1px dashed #ccc'
    }
    else {
      const resolved = context.resolver.resolve(node.binding.path, context.data)
      if (resolved != null) {
        content = String(resolved)
        if (node.binding.formatter) {
          content = context.resolver.format(resolved, node.binding.formatter)
        }
      }
    }
  }

  // innerHTML is used for rich text to support HTML formatting.
  // Content is expected to be sanitized before being stored in the schema.
  el.innerHTML = content

  // ── 垂直对齐 ──
  if (props.verticalAlign && props.verticalAlign !== 'top') {
    el.style.display = 'flex'
    el.style.alignItems = props.verticalAlign === 'middle' ? 'center' : 'flex-end'
  }

  return el
}
