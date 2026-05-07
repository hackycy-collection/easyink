import type { DesignerStore } from '../store/designer-store'

export function expandElementIdsForGroups(store: DesignerStore, elementIds: readonly string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  const existing = new Set(store.getElements().map(node => node.id))

  function add(id: string) {
    if (!existing.has(id) || seen.has(id))
      return
    seen.add(id)
    result.push(id)
  }

  for (const elementId of elementIds) {
    const group = findGroupForElement(store, elementId)
    if (!group) {
      add(elementId)
      continue
    }
    for (const memberId of group.memberIds)
      add(memberId)
  }

  return result
}

export function selectedLogicalGroupIds(store: DesignerStore): string[] {
  const groupIds: string[] = []
  const seen = new Set<string>()
  for (const elementId of store.selection.ids) {
    const group = findGroupForElement(store, elementId)
    if (!group || seen.has(group.id))
      continue
    seen.add(group.id)
    groupIds.push(group.id)
  }
  return groupIds
}

export function hasGroupedElement(store: DesignerStore, elementIds: readonly string[]): boolean {
  return elementIds.some(elementId => findGroupForElement(store, elementId) != null)
}

function findGroupForElement(store: DesignerStore, elementId: string) {
  return store.schema.groups?.find(group => group.memberIds.includes(elementId))
}
