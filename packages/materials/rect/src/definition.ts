import type { MaterialTypeDefinition } from '@easyink/core'
import { rectPropSchemas } from './props'

export const rectDefinition: MaterialTypeDefinition = {
  type: 'rect',
  name: '矩形',
  icon: 'rect',
  category: 'basic',
  propSchemas: rectPropSchemas,
  defaultProps: {
    borderRadius: 0,
    fill: 'transparent',
  },
  defaultLayout: {
    position: 'absolute',
    width: 100,
    height: 60,
  },
}
