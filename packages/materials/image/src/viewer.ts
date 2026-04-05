import type { MaterialNode } from '@easyink/schema'
import type { ImageProps } from './schema'

export function renderImage(node: MaterialNode) {
  const props = node.props as unknown as ImageProps
  if (!props.src) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#999;font-size:12px;">[Image]</div>',
    }
  }
  return {
    html: `<img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt)}" style="width:100%;height:100%;object-fit:${props.fit};" />`,
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
