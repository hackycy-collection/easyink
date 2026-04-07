import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const LINE_TYPE = 'line'

export interface LineProps {
  lineWidth: number
  lineColor: string
  lineType: 'solid' | 'dashed' | 'dotted'
}

export const LINE_DEFAULTS: LineProps = {
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
    height: 5,
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
