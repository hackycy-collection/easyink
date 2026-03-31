import type { PropSchema } from '@easyink/core'

export const tablePropSchemas: PropSchema[] = [
  { key: 'bordered', label: '显示边框', type: 'boolean', group: '表格', defaultValue: true },
  {
    key: 'borderStyle',
    label: '边框样式',
    type: 'select',
    group: '表格',
    defaultValue: 'solid',
    enum: [
      { label: 'solid', value: 'solid' },
      { label: 'dashed', value: 'dashed' },
      { label: 'dotted', value: 'dotted' },
    ],
  },
]
