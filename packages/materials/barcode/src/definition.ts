import type { MaterialTypeDefinition } from '@easyink/core'
import { barcodePropSchemas } from './props'

export const barcodeDefinition: MaterialTypeDefinition = {
  type: 'barcode',
  name: '条形码',
  icon: 'barcode',
  category: 'data',
  propSchemas: barcodePropSchemas,
  defaultProps: {
    format: 'CODE128',
    value: '',
    displayValue: true,
    barWidth: 2,
    errorCorrectionLevel: 'M',
  },
  defaultLayout: {
    position: 'absolute',
    width: 150,
    height: 60,
  },
}
