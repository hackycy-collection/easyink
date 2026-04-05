import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const RECT_TYPE = 'rect'

export interface RectProps {
  fillColor: string
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
  borderRadius: number
}

export const RECT_DEFAULTS: RectProps = {
  fillColor: 'transparent',
  borderWidth: 1,
  borderColor: '#000000',
  borderType: 'solid',
  borderRadius: 0,
}

export function createRectNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('rect'),
    type: RECT_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    props: { ...RECT_DEFAULTS },
    ...partial,
  }
}

export const RECT_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}
