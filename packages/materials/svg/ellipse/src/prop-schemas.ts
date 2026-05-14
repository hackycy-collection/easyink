import type { PropSchema } from '@easyink/core'

export const svgEllipseDesignerPropSchemas: PropSchema[] = [
  { key: 'fillColor', label: '填充颜色', type: 'color', group: 'appearance' },
  { key: 'borderWidth', label: '描边宽度', type: 'number', group: 'border', min: 0, max: 20, step: 0.1 },
  { key: 'borderColor', label: '描边颜色', type: 'color', group: 'border' },
  { key: 'ellipseInset', label: '内边距', type: 'number', group: 'shape', min: 0, max: 36, step: 0.5 },
]
