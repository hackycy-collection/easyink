import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const ELLIPSE_TYPE = 'ellipse'

export interface EllipseProps {
  fillColor: string
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
}

export const ELLIPSE_DEFAULTS: EllipseProps = {
  fillColor: 'transparent',
  borderWidth: 1,
  borderColor: '#000000',
  borderType: 'solid',
}

export function createEllipseNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('ell'),
    type: ELLIPSE_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    props: { ...ELLIPSE_DEFAULTS },
    ...partial,
  }
}

export const ELLIPSE_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}
