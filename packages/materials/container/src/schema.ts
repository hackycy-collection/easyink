import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

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
  padding: 2.12,
  gap: 1.06,
  direction: 'column',
  fillColor: 'transparent',
  borderWidth: 0,
  borderColor: '#000000',
  borderType: 'solid',
}

export function createContainerNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (v: number) => convertUnit(v, 'mm', unit) : (v: number) => v
  return {
    id: generateId('ctn'),
    type: CONTAINER_TYPE,
    x: 0,
    y: 0,
    width: c(200),
    height: c(150),
    props: {
      ...CONTAINER_DEFAULTS,
      padding: c(CONTAINER_DEFAULTS.padding),
      gap: c(CONTAINER_DEFAULTS.gap),
    },
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
