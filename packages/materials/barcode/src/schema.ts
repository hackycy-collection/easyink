import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const BARCODE_TYPE = 'barcode'

export interface BarcodeProps {
  value: string
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14'
  showText: boolean
  lineWidth: number
  lineColor: string
  backgroundColor: string
}

export const BARCODE_DEFAULTS: BarcodeProps = {
  value: '',
  format: 'CODE128',
  showText: true,
  lineWidth: 2,
  lineColor: '#000000',
  backgroundColor: '#ffffff',
}

export function createBarcodeNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('bc'),
    type: BARCODE_TYPE,
    x: 0,
    y: 0,
    width: 150,
    height: 60,
    props: { ...BARCODE_DEFAULTS },
    ...partial,
  }
}

export const BARCODE_CAPABILITIES = {
  bindable: true,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: true,
}
