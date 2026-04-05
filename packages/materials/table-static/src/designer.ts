import type { MaterialNode } from '@easyink/schema'

export function getTableStaticContextActions(_node: MaterialNode) {
  return [
    { id: 'insert-row', label: 'Insert Row' },
    { id: 'insert-col', label: 'Insert Column' },
    { id: 'delete-row', label: 'Delete Row' },
    { id: 'delete-col', label: 'Delete Column' },
  ]
}
