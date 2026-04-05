import type { MaterialNode } from '@easyink/schema'

export function getTextToolbarActions(_node: MaterialNode) {
  return [
    { id: 'bold', label: 'B' },
    { id: 'italic', label: 'I' },
    { id: 'underline', label: 'U' },
  ]
}

export function getTextContextActions(_node: MaterialNode) {
  return [
    { id: 'edit-text', label: 'Edit Text' },
  ]
}
