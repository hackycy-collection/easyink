import type { MaterialNode } from '@easyink/schema'

export function getBarcodeContextActions(_node: MaterialNode) {
  return [
    { id: 'edit-value', label: 'Edit Value' },
  ]
}
