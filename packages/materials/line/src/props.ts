import type { PropSchema } from '@easyink/core'

export const linePropSchemas: PropSchema[] = [
  {
    key: 'direction',
    label: '方向',
    type: 'select',
    group: '线条',
    defaultValue: 'horizontal',
    enum: [
      { label: 'horizontal', value: 'horizontal' },
      { label: 'vertical', value: 'vertical' },
      { label: 'custom', value: 'custom' },
    ],
  },
  {
    key: 'strokeWidth',
    label: '线宽',
    type: 'number',
    group: '线条',
    defaultValue: 1,
    min: 0.5,
    step: 0.5,
  },
  { key: 'strokeColor', label: '颜色', type: 'color', group: '线条', defaultValue: '#000000' },
  {
    key: 'strokeStyle',
    label: '样式',
    type: 'select',
    group: '线条',
    defaultValue: 'solid',
    enum: [
      { label: 'solid', value: 'solid' },
      { label: 'dashed', value: 'dashed' },
      { label: 'dotted', value: 'dotted' },
    ],
  },
  {
    key: 'endX',
    label: '终点X偏移',
    type: 'number',
    group: '线条',
    visible: (props: Record<string, unknown>) => props.direction === 'custom',
  },
  {
    key: 'endY',
    label: '终点Y偏移',
    type: 'number',
    group: '线条',
    visible: (props: Record<string, unknown>) => props.direction === 'custom',
  },
]
