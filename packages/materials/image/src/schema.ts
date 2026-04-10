import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const IMAGE_TYPE = 'image'

export interface ImageProps {
  src: string
  fit: 'contain' | 'cover' | 'fill' | 'none'
  alt: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
}

export const IMAGE_DEFAULTS: ImageProps = {
  src: '',
  fit: 'contain',
  alt: '',
  backgroundColor: '',
  borderWidth: 0,
  borderColor: '#000000',
  borderType: 'solid',
}

export function createImageNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('img'),
    type: IMAGE_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    props: { ...IMAGE_DEFAULTS },
    ...partial,
  }
}

export const IMAGE_CAPABILITIES = {
  bindable: true,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}
