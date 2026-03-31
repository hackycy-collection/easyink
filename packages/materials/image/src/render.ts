import type { MaterialRenderFunction } from '@easyink/renderer'

interface ImageProps {
  src: string
  fit: 'contain' | 'cover' | 'fill' | 'none'
  alt?: string
}

export const renderImage: MaterialRenderFunction = (node, context) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'easyink-material easyink-image'
  wrapper.dataset.materialId = node.id
  wrapper.style.overflow = 'hidden'

  const props = node.props as unknown as ImageProps

  let src: string = props.src ?? ''
  if (node.binding?.path) {
    if (context.designMode) {
      const placeholder = document.createElement('div')
      placeholder.style.width = '100%'
      placeholder.style.height = '100%'
      placeholder.style.display = 'flex'
      placeholder.style.alignItems = 'center'
      placeholder.style.justifyContent = 'center'
      placeholder.style.border = '1px dashed #ccc'
      placeholder.style.color = '#999'
      placeholder.style.fontSize = '12px'
      placeholder.textContent = `{{${node.binding.path}}}`
      wrapper.appendChild(placeholder)
      return wrapper
    }
    const resolved = context.resolver.resolve(node.binding.path, context.data)
    if (resolved != null)
      src = String(resolved)
  }

  const img = document.createElement('img')
  img.src = src
  img.alt = props.alt ?? ''

  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = props.fit ?? 'contain'
  img.style.display = 'block'

  wrapper.appendChild(img)
  return wrapper
}
