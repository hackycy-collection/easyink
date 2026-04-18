import type { DocumentSchema, MaterialNode } from '@easyink/schema'

/**
 * 以点分路径读取对象字段。不可变编辑不修改源对象。
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (path === '')
    return obj
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object')
      return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * 沿点分路径进行不可变写入：仅克隆路径上被修改的对象节点（结构共享）。
 */
export function setByPathImmutable<T>(obj: T, path: string, value: unknown): T {
  if (path === '')
    return value as T
  const parts = path.split('.')
  return setInternal(obj as unknown as Record<string, unknown>, parts, 0, value) as T
}

function setInternal(
  obj: Record<string, unknown> | undefined,
  parts: string[],
  index: number,
  value: unknown,
): Record<string, unknown> {
  const key = parts[index]!
  const source = (obj ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = { ...source }
  if (index === parts.length - 1) {
    if (value === undefined)
      delete next[key]
    else
      next[key] = value
  }
  else {
    const child = source[key]
    const childObj = (child != null && typeof child === 'object' && !Array.isArray(child))
      ? (child as Record<string, unknown>)
      : undefined
    next[key] = setInternal(childObj, parts, index + 1, value)
  }
  return next
}

/** 查找节点（仅顶层 elements；嵌套物料暂不支持深度查找） */
export function findNodeIndex(elements: readonly MaterialNode[], id: string): number {
  return elements.findIndex(el => el.id === id)
}

export function findNode(elements: readonly MaterialNode[], id: string): MaterialNode | undefined {
  return elements.find(el => el.id === id)
}

/** 克隆 doc.elements 数组并执行 updater；其他字段保持共享引用 */
export function withElements(
  doc: DocumentSchema,
  updater: (elements: MaterialNode[]) => MaterialNode[],
): DocumentSchema {
  return { ...doc, elements: updater([...doc.elements]) }
}

/** 对单个节点做不可变 patch */
export function patchNode(
  doc: DocumentSchema,
  nodeId: string,
  patcher: (node: MaterialNode) => MaterialNode,
): DocumentSchema | undefined {
  const idx = findNodeIndex(doc.elements, nodeId)
  if (idx < 0)
    return undefined
  const node = doc.elements[idx]!
  const next = patcher(node)
  if (next === node)
    return doc
  return withElements(doc, (elements) => {
    elements[idx] = next
    return elements
  })
}

/** 深拷贝（JSON round-trip）；仅用于 invert 需要保存完整快照时。 */
export function snapshotJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
