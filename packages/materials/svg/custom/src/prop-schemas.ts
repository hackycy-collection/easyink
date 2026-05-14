import type { PropSchema } from '@easyink/core'

const SVG_PRESERVE_ASPECT_RATIO_OPTIONS: NonNullable<PropSchema['enum']> = [
  { label: '铺满物料', value: 'none' },
  { label: '等比完整显示', value: 'xMidYMid meet' },
  { label: '等比裁切铺满', value: 'xMidYMid slice' },
]

export const svgCustomDesignerPropSchemas: PropSchema[] = [
  { key: 'content', label: '粘贴 SVG', type: 'textarea', group: 'content', editorOptions: { rows: 8, placeholder: '<svg viewBox="0 0 24 24">\n  <path d="..." />\n</svg>' } },
  { key: 'viewBox', label: '坐标范围', type: 'string', group: 'content', editorOptions: { placeholder: '0 0 100 100' } },
  { key: 'preserveAspectRatio', label: '缩放方式', type: 'enum', group: 'content', enum: SVG_PRESERVE_ASPECT_RATIO_OPTIONS },
  { key: 'fillColor', label: '默认填充色', type: 'color', group: 'appearance' },
]
