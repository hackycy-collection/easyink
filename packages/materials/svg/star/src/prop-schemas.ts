import type { PropSchema } from '@easyink/core'

export const svgStarDesignerPropSchemas: PropSchema[] = [
  { key: 'fillColor', label: '填充颜色', type: 'color', group: 'appearance' },
  { key: 'borderWidth', label: '描边宽度', type: 'number', group: 'border', min: 0, max: 20, step: 0.1 },
  { key: 'borderColor', label: '描边颜色', type: 'color', group: 'border' },
  { key: 'starPoints', label: '星角数量', type: 'number', group: 'shape', min: 3, max: 24, step: 1 },
  { key: 'starInnerRatio', label: '内角比例', type: 'number', group: 'shape', min: 0.08, max: 0.95, step: 0.01 },
]
