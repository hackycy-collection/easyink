import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

export const TEXT_TYPE = 'text'

export interface TextProps {
  content: string
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
  autoWrap: boolean
  overflow: 'visible' | 'hidden' | 'ellipsis'
  richText: boolean
  prefix: string
  suffix: string
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
}

export const TEXT_DEFAULTS: TextProps = {
  content: '',
  fontSize: 4.23,
  fontFamily: '',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  backgroundColor: '',
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: 1.5,
  letterSpacing: 0,
  autoWrap: true,
  overflow: 'hidden',
  richText: false,
  prefix: '',
  suffix: '',
  borderWidth: 0,
  borderColor: '#000000',
  borderType: 'solid',
}

export function createTextNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (v: number) => convertUnit(v, 'mm', unit) : (v: number) => v
  return {
    id: generateId('text'),
    type: TEXT_TYPE,
    x: 0,
    y: 0,
    width: c(80),
    height: c(20),
    props: {
      ...TEXT_DEFAULTS,
      fontSize: c(TEXT_DEFAULTS.fontSize),
      letterSpacing: c(TEXT_DEFAULTS.letterSpacing),
    },
    ...partial,
  }
}

export const TEXT_CAPABILITIES = {
  bindable: true,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: true,
  multiBinding: false,
}
