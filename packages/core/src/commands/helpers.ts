import type { MaterialNode } from '@easyink/schema'

export function findNode(elements: MaterialNode[], id: string): MaterialNode | undefined {
  return elements.find(el => el.id === id)
}

export function asRecord(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>
}
