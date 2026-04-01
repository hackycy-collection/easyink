import type { DataFieldNode } from '@easyink/core'

export interface BindingDragData {
  key?: string
  fullPath?: string
  path: string
  sourceDisplayName?: string
  sourceName?: string
  title?: string
}

interface BindingDragSourceMeta {
  sourceDisplayName?: string
  sourceName?: string
}

export function createBindingDragData(
  node: DataFieldNode,
  meta?: BindingDragSourceMeta,
): BindingDragData | null {
  const key = normalizeOptionalString(node.key)
  const fullPath = normalizeOptionalString(node.fullPath)
  const path = fullPath ?? key

  if (!path) {
    return null
  }

  return {
    key,
    fullPath,
    path,
    sourceDisplayName: normalizeOptionalString(meta?.sourceDisplayName),
    sourceName: normalizeOptionalString(meta?.sourceName),
    title: normalizeOptionalString(node.title),
  }
}

export function writeBindingDragData(
  dataTransfer: DataTransfer | null | undefined,
  payload: BindingDragData,
): void {
  if (!dataTransfer) {
    return
  }

  dataTransfer.setData('application/easyink-binding', JSON.stringify(payload))
  dataTransfer.setData('text/plain', payload.path)
  dataTransfer.effectAllowed = 'link'
}

export function readBindingDragData(
  dataTransfer: Pick<DataTransfer, 'getData'> | null | undefined,
): BindingDragData | null {
  if (!dataTransfer) {
    return null
  }

  const raw = normalizeOptionalString(dataTransfer.getData('application/easyink-binding'))
  if (raw) {
    try {
      return normalizeBindingDragData(JSON.parse(raw))
    }
    catch {
      return null
    }
  }

  const plainTextPath = normalizeOptionalString(dataTransfer.getData('text/plain'))
  if (!plainTextPath) {
    return null
  }

  return { path: plainTextPath }
}

function normalizeBindingDragData(input: unknown): BindingDragData | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const payload = input as Partial<BindingDragData>
  const key = normalizeOptionalString(payload.key)
  const fullPath = normalizeOptionalString(payload.fullPath)
  const path = normalizeOptionalString(payload.path) ?? fullPath ?? key

  if (!path) {
    return null
  }

  return {
    key,
    fullPath,
    path,
    sourceDisplayName: normalizeOptionalString(payload.sourceDisplayName),
    sourceName: normalizeOptionalString(payload.sourceName),
    title: normalizeOptionalString(payload.title),
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}
