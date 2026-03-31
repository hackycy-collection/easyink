import type { MaterialTypeDefinition } from '@easyink/core'
import { textPropSchemas } from './props'

export const textDefinition: MaterialTypeDefinition = {
  type: 'text',
  name: '文本',
  icon: 'text',
  category: 'basic',
  propSchemas: textPropSchemas,
  defaultProps: {
    content: '',
    verticalAlign: 'top',
    wordBreak: 'normal',
    overflow: 'visible',
  },
  defaultLayout: {
    position: 'absolute',
    width: 100,
    height: 30,
  },
  defaultStyle: {
    fontSize: 14,
    color: '#000000',
  },
}
