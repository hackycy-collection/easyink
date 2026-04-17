import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const PAGE_NUMBER_TYPE = 'page-number'

export interface PageNumberProps {
  format: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  backgroundColor: string
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  lineHeight: number
  letterSpacing: number
}

export const PAGE_NUMBER_DEFAULTS: PageNumberProps = {
  format: '{current}/{total}',
  fontSize: 10,
  fontFamily: '',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  backgroundColor: '',
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: 1.5,
  letterSpacing: 0,
}

export function createPageNumberNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('pgnum'),
    type: PAGE_NUMBER_TYPE,
    x: 0,
    y: 0,
    width: 60,
    height: 16,
    props: { ...PAGE_NUMBER_DEFAULTS },
    ...partial,
  }
}

export const PAGE_NUMBER_CAPABILITIES = {
  bindable: false,
  rotatable: false,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  pageAware: true,
  multiBinding: false,
}
