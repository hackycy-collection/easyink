import type { PropSchema } from '@easyink/core'

export const svgHeartDesignerPropSchemas: PropSchema[] = [
  { key: 'fillColor', label: 'designer.property.fillColor', type: 'color', group: 'appearance' },
  { key: 'borderWidth', label: 'designer.property.borderWidth', type: 'number', group: 'border', min: 0, max: 20, step: 0.1 },
  { key: 'borderColor', label: 'designer.property.borderColor', type: 'color', group: 'border' },
  { key: 'heartCleftDepth', label: 'designer.property.heartCleftDepth', type: 'number', group: 'shape', min: 6, max: 34, step: 1 },
  { key: 'heartShoulderWidth', label: 'designer.property.heartShoulderWidth', type: 'number', group: 'shape', min: 10, max: 30, step: 1 },
]
