import type { BindingRef } from '@easyink/schema'
import { BLOCKED_PATH_KEYS, FIELD_PATH_SEPARATOR } from '@easyink/shared'

/**
 * Resolve a binding reference against the runtime data root.
 * Uses the canonical field path (/ separated).
 */
export function resolveBindingValue(
  binding: BindingRef,
  data: Record<string, unknown>,
): unknown {
  const path = binding.fieldPath
  if (!path)
    return undefined

  const segments = path.split(FIELD_PATH_SEPARATOR).filter(Boolean)
  let current: unknown = data

  for (const segment of segments) {
    if (BLOCKED_PATH_KEYS.has(segment))
      return undefined
    if (typeof current !== 'object' || current === null)
      return undefined
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

/**
 * Resolve all bindings for a node, returning a map of values.
 */
export function resolveNodeBindings(
  bindings: BindingRef | BindingRef[] | undefined,
  data: Record<string, unknown>,
): Map<number, unknown> {
  const result = new Map<number, unknown>()
  if (!bindings)
    return result

  const refs = Array.isArray(bindings) ? bindings : [bindings]
  for (const ref of refs) {
    const value = resolveBindingValue(ref, data)
    result.set(ref.bindIndex ?? 0, value)
  }

  return result
}

/**
 * Extract the common collection path from a set of absolute field paths.
 * Each path is split by separator, and the collection part is all segments
 * except the last. All paths must share the same collection prefix.
 *
 * Example: ['items/name', 'items/qty'] => 'items'
 * Example: ['items/name', 'orders/qty'] => undefined (mismatch)
 * Example: [] => undefined
 */
export function extractCollectionPath(fieldPaths: string[]): string | undefined {
  if (fieldPaths.length === 0)
    return undefined
  const collectionParts = fieldPaths.map((p) => {
    const segments = p.split(FIELD_PATH_SEPARATOR)
    return segments.slice(0, -1).join(FIELD_PATH_SEPARATOR)
  })
  const first = collectionParts[0]!
  if (!first)
    return undefined
  if (collectionParts.every(cp => cp === first))
    return first
  return undefined
}

/**
 * Resolve a leaf field path against a single record.
 * Used during repeat-template expansion to resolve cell values
 * within individual collection items.
 */
export function resolveFieldFromRecord(
  leafField: string,
  record: Record<string, unknown>,
): unknown {
  if (!leafField)
    return undefined
  const segments = leafField.split(FIELD_PATH_SEPARATOR).filter(Boolean)
  let current: unknown = record
  for (const segment of segments) {
    if (BLOCKED_PATH_KEYS.has(segment))
      return undefined
    if (typeof current !== 'object' || current === null)
      return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}
