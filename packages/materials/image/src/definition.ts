import type { MaterialTypeDefinition } from '@easyink/core'
import { imagePropSchemas } from './props'

export const imageDefinition: MaterialTypeDefinition = {
  type: 'image',
  name: '图片',
  icon: 'image',
  category: 'basic',
  propSchemas: imagePropSchemas,
  defaultProps: {
    src: '',
    fit: 'contain',
    alt: '',
  },
  defaultLayout: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
}
