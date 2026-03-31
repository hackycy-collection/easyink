import type { PropSchema } from '@easyink/core'

export const imagePropSchemas: PropSchema[] = [
  { key: 'src', label: '图片地址', type: 'string', group: '图片', defaultValue: '' },
  {
    key: 'fit',
    label: '填充模式',
    type: 'select',
    group: '图片',
    defaultValue: 'contain',
    enum: [
      { label: 'contain', value: 'contain' },
      { label: 'cover', value: 'cover' },
      { label: 'fill', value: 'fill' },
      { label: 'none', value: 'none' },
    ],
  },
  { key: 'alt', label: '替代文本', type: 'string', group: '图片', defaultValue: '' },
]
