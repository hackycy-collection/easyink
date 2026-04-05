import type { MaterialNode } from '@easyink/schema'

export function getImageContextActions(_node: MaterialNode) {
  return [
    { id: 'change-image', label: 'Change Image' },
  ]
}
