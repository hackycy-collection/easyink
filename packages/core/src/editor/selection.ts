import type { Selection, SelectionJSON, SelectionTypeSpec } from './types'

/** 空选区（画布空白处） */
export interface EmptySelection extends Selection {
  type: 'empty'
  nodeId: null
  path: null
}

/** 单元素选中 */
export interface ElementSelection extends Selection {
  type: 'element'
  nodeId: string
  path: null
}

/** 多元素选区（v1 UI 不使用，仅协议预留） */
export interface ElementRangeSelection extends Selection {
  type: 'element-range'
  nodeId: null
  path: readonly string[] // 选中的 nodeId 列表
}

export function emptySelection(): EmptySelection {
  return {
    type: 'empty',
    nodeId: null,
    path: null,
    toJSON: () => ({ type: 'empty', nodeId: null, path: null }),
  }
}

export function elementSelection(nodeId: string): ElementSelection {
  return {
    type: 'element',
    nodeId,
    path: null,
    toJSON: () => ({ type: 'element', nodeId, path: null }),
  }
}

export function elementRangeSelection(ids: readonly string[]): ElementRangeSelection {
  const path = Object.freeze([...ids])
  return {
    type: 'element-range',
    nodeId: null,
    path,
    toJSON: () => ({ type: 'element-range', nodeId: null, path }),
  }
}

// ─── Selection type registry ──────────────────────────────────────

const registry = new Map<string, SelectionTypeSpec>()

export function registerSelectionType(spec: SelectionTypeSpec): void {
  registry.set(spec.type, spec)
}

export function getSelectionTypeSpec(type: string): SelectionTypeSpec | undefined {
  return registry.get(type)
}

const emptySpec: SelectionTypeSpec = {
  type: 'empty',
  fromJSON: () => emptySelection(),
}

const elementSpec: SelectionTypeSpec = {
  type: 'element',
  fromJSON: (json) => {
    if (!json.nodeId)
      throw new Error('[editor] element selection requires nodeId')
    return elementSelection(json.nodeId)
  },
}

const elementRangeSpec: SelectionTypeSpec = {
  type: 'element-range',
  fromJSON: (json) => {
    const ids = Array.isArray(json.path) ? json.path.filter((id): id is string => typeof id === 'string') : []
    return elementRangeSelection(ids)
  },
}

registerSelectionType(emptySpec)
registerSelectionType(elementSpec)
registerSelectionType(elementRangeSpec)

export function deserializeSelection(json: SelectionJSON, doc: import('@easyink/schema').DocumentSchema): Selection {
  const spec = registry.get(json.type)
  if (!spec)
    throw new Error(`[editor] unknown selection type: ${json.type}`)
  return spec.fromJSON(json, doc)
}
