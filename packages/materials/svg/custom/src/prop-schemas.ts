import type { PropSchema } from '@easyink/core'

export const svgCustomDesignerPropSchemas: PropSchema[] = [
  { key: 'content', label: 'SVG 内容', type: 'textarea', group: 'content' },
  { key: 'viewBox', label: '视图框', type: 'string', group: 'content' },
  { key: 'preserveAspectRatio', label: '缩放模式', type: 'string', group: 'content' },
  { key: 'fillColor', label: '默认填充色', type: 'color', group: 'appearance' },
]
