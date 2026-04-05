import type { MaterialNode } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const QRCODE_TYPE = 'qrcode'

export interface QrcodeProps {
  value: string
  size: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  foreground: string
  background: string
}

export const QRCODE_DEFAULTS: QrcodeProps = {
  value: '',
  size: 100,
  errorCorrectionLevel: 'M',
  foreground: '#000000',
  background: '#ffffff',
}

export function createQrcodeNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('qr'),
    type: QRCODE_TYPE,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    props: { ...QRCODE_DEFAULTS },
    ...partial,
  }
}

export const QRCODE_CAPABILITIES = {
  bindable: true,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: false,
}
