import type { MaterialRenderFunction } from '@easyink/renderer'

interface TextProps {
  content: string
  verticalAlign?: 'top' | 'middle' | 'bottom'
  wordBreak?: 'normal' | 'break-all' | 'break-word'
  overflow?: 'visible' | 'hidden' | 'ellipsis'
}

export const renderText: MaterialRenderFunction = (node, context) => {
  const el = document.createElement('div')
  el.className = 'easyink-material easyink-text'
  el.dataset.materialId = node.id

  const props = node.props as unknown as TextProps

  // ── 解析内容 ──
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
        if (Array.isArray(resolved)) {
          content = resolved.join(', ')
        }
        else {
          content = String(resolved)
        }
        if (node.binding.formatter) {
          content = context.resolver.format(
            Array.isArray(resolved) ? resolved : resolved,
            node.binding.formatter,
          )
        }
      }
    }
  }

  el.textContent = content

  // ── 垂直对齐 ──
  if (props.verticalAlign && props.verticalAlign !== 'top') {
    el.style.display = 'flex'
    el.style.alignItems = props.verticalAlign === 'middle' ? 'center' : 'flex-end'
  }

  // ── 文本换行 ──
  if (props.wordBreak)
    el.style.wordBreak = props.wordBreak

  // ── 溢出 ──
  if (props.overflow === 'hidden') {
    el.style.overflow = 'hidden'
  }
  else if (props.overflow === 'ellipsis') {
    el.style.overflow = 'hidden'
    el.style.textOverflow = 'ellipsis'
    el.style.whiteSpace = 'nowrap'
  }

  return el
}
