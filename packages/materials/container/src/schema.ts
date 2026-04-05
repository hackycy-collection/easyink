import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const CONTAINER_TYPE = 'container'

export interface ContainerProps {
  padding: number
  gap: number
  direction: 'row' | 'column'
  fillColor: string
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
}

export const CONTAINER_DEFAULTS: ContainerProps = {
  padding: 8,
  gap: 4,
  direction: 'column',
  fillColor: 'transparent',
  borderWidth: 0,
  borderColor: '#000000',
  borderType: 'solid',
}

export function createContainerNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('ctn'),
    type: CONTAINER_TYPE,
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    props: { ...CONTAINER_DEFAULTS },
    children: [],
    ...partial,
  }
}

export const CONTAINER_CAPABILITIES = {
  bindable: false,
  rotatable: false,
  resizable: true,
  supportsChildren: true,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: false,
}
