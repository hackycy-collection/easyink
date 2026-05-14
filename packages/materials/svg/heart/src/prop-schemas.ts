import type { PropSchema } from '@easyink/core'

export const svgHeartDesignerPropSchemas: PropSchema[] = [
  { key: 'fillColor', label: '填充颜色', type: 'color', group: 'appearance' },
  { key: 'borderWidth', label: '描边宽度', type: 'number', group: 'border', min: 0, max: 20, step: 0.1 },
  { key: 'borderColor', label: '描边颜色', type: 'color', group: 'border' },
  { key: 'heartCleftDepth', label: '凹口深度', type: 'number', group: 'shape', min: 6, max: 34, step: 1 },
  { key: 'heartShoulderWidth', label: '肩宽', type: 'number', group: 'shape', min: 10, max: 30, step: 1 },
]
