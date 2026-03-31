import type { PropSchema } from '@easyink/core'

export const barcodePropSchemas: PropSchema[] = [
  {
    key: 'format',
    label: '编码格式',
    type: 'select',
    group: '条形码',
    defaultValue: 'CODE128',
    enum: [
      { label: 'CODE128', value: 'CODE128' },
      { label: 'EAN13', value: 'EAN13' },
      { label: 'EAN8', value: 'EAN8' },
      { label: 'UPC', value: 'UPC' },
      { label: 'CODE39', value: 'CODE39' },
      { label: 'ITF14', value: 'ITF14' },
      { label: 'QR', value: 'QR' },
    ],
  },
  { key: 'value', label: '内容', type: 'string', group: '条形码', defaultValue: '' },
  {
    key: 'displayValue',
    label: '显示文字',
    type: 'boolean',
    group: '条形码',
    defaultValue: true,
  },
  {
    key: 'barWidth',
    label: '线条宽度',
    type: 'number',
    group: '条形码',
    defaultValue: 2,
    min: 1,
    max: 5,
    step: 0.5,
  },
  {
    key: 'errorCorrectionLevel',
    label: '纠错级别',
    type: 'select',
    group: '条形码',
    defaultValue: 'M',
    enum: [
      { label: 'L', value: 'L' },
      { label: 'M', value: 'M' },
      { label: 'Q', value: 'Q' },
      { label: 'H', value: 'H' },
    ],
    visible: (props: Record<string, unknown>) => props.format === 'QR',
  },
]
