import type { MaterialNode } from '@easyink/schema'

export function getQrcodeContextActions(_node: MaterialNode) {
  return [
    { id: 'edit-value', label: 'Edit Value' },
  ]
}
