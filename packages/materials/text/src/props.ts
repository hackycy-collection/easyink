import type { PropSchema } from '@easyink/core'

export const textPropSchemas: PropSchema[] = [
  { key: 'content', label: '内容', type: 'string', group: '文本', defaultValue: '' },
  {
    key: 'verticalAlign',
    label: '垂直对齐',
    type: 'select',
    group: '文本',
    defaultValue: 'top',
    enum: [
      { label: 'top', value: 'top' },
      { label: 'middle', value: 'middle' },
      { label: 'bottom', value: 'bottom' },
    ],
  },
  {
    key: 'wordBreak',
    label: '换行',
    type: 'select',
    group: '文本',
    defaultValue: 'normal',
    enum: [
      { label: 'normal', value: 'normal' },
      { label: 'break-all', value: 'break-all' },
      { label: 'break-word', value: 'break-word' },
    ],
  },
  {
    key: 'overflow',
    label: '溢出',
    type: 'select',
    group: '文本',
    defaultValue: 'visible',
    enum: [
      { label: 'visible', value: 'visible' },
      { label: 'hidden', value: 'hidden' },
      { label: 'ellipsis', value: 'ellipsis' },
    ],
  },
]
