import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const LINE_TYPE = 'line'

export interface LineProps {
  startX: number
  startY: number
  endX: number
  endY: number
  lineWidth: number
  lineColor: string
  lineType: 'solid' | 'dashed' | 'dotted'
}

export const LINE_DEFAULTS: LineProps = {
  startX: 0,
  startY: 0,
  endX: 100,
  endY: 0,
  lineWidth: 1,
  lineColor: '#000000',
  lineType: 'solid',
}

export function createLineNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('line'),
    type: LINE_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 1,
    props: { ...LINE_DEFAULTS },
    ...partial,
  }
}

export const LINE_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: false,
}
