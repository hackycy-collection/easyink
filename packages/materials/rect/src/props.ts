import type { PropSchema } from '@easyink/core'

export const rectPropSchemas: PropSchema[] = [
  {
    key: 'borderRadius',
    label: '圆角',
    type: 'number',
    group: '矩形',
    defaultValue: 0,
    min: 0,
  },
  { key: 'fill', label: '填充色', type: 'color', group: '矩形', defaultValue: 'transparent' },
]
