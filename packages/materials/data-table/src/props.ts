import type { PropSchema } from '@easyink/core'

export const dataTablePropSchemas: PropSchema[] = [
  { key: 'bordered', label: '显示边框', type: 'boolean', group: '表格', defaultValue: true },
  { key: 'striped', label: '斑马纹', type: 'boolean', group: '表格', defaultValue: false },
  {
    key: 'rowHeight',
    label: '行高',
    type: 'number',
    group: '表格',
    defaultValue: 'auto',
    min: 0,
  },
  { key: 'showHeader', label: '显示表头', type: 'boolean', group: '表格', defaultValue: true },
]
