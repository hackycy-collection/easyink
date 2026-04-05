import type { MaterialNode } from '@easyink/schema'

export function getContainerContextActions(_node: MaterialNode) {
  return [
    { id: 'add-child', label: 'Add Child' },
  ]
}
