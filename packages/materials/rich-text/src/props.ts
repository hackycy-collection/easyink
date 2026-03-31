import type { PropSchema } from '@easyink/core'

export const richTextPropSchemas: PropSchema[] = [
  { key: 'content', label: '内容', type: 'string', group: '富文本', defaultValue: '' },
  {
    key: 'verticalAlign',
    label: '垂直对齐',
    type: 'select',
    group: '富文本',
    defaultValue: 'top',
    enum: [
      { label: 'top', value: 'top' },
      { label: 'middle', value: 'middle' },
      { label: 'bottom', value: 'bottom' },
    ],
  },
]
