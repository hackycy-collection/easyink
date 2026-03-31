import type { MaterialTypeDefinition } from '@easyink/core'
import { richTextPropSchemas } from './props'

export const richTextDefinition: MaterialTypeDefinition = {
  type: 'rich-text',
  name: '富文本',
  icon: 'rich-text',
  category: 'basic',
  propSchemas: richTextPropSchemas,
  defaultProps: {
    content: '',
    verticalAlign: 'top',
  },
  defaultLayout: {
    position: 'absolute',
    width: 200,
    height: 60,
  },
  defaultStyle: {
    fontSize: 14,
    color: '#000000',
  },
}
