import type { MaterialTypeDefinition } from '@easyink/core'
import { linePropSchemas } from './props'

export const lineDefinition: MaterialTypeDefinition = {
  type: 'line',
  name: '线条',
  icon: 'line',
  category: 'basic',
  propSchemas: linePropSchemas,
  defaultProps: {
    direction: 'horizontal',
    strokeWidth: 1,
    strokeColor: '#000000',
    strokeStyle: 'solid',
  },
  defaultLayout: {
    position: 'absolute',
    width: 100,
    height: 0,
  },
}
