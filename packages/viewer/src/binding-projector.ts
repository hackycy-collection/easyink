import type { MaterialNode } from '@easyink/schema'
import type { ProjectedBinding } from './types'
import { formatBindingDisplayValue, resolveBindingValue } from '@easyink/core'

/**
 * Resolve all bindings for a material node against the provided data.
 */
export function projectBindings(
  node: MaterialNode,
  data: Record<string, unknown>,
): ProjectedBinding[] {
  if (!node.binding)
    return []

  const refs = Array.isArray(node.binding) ? node.binding : [node.binding]
  const results: ProjectedBinding[] = []

  for (const ref of refs) {
    const value = resolveBindingValue(ref, data)
    const formatted = formatBindingDisplayValue(value, ref)
    results.push({
      bindIndex: ref.bindIndex ?? 0,
      value: formatted.value,
      hasFormatAffix: !!(ref.format?.prefix || ref.format?.suffix),
      diagnostics: formatted.diagnostics,
    })
  }

  return results
}

/**
 * Apply projected binding values to a copy of the node's props.
 * Primary binding (bindIndex 0) maps to the material's main content prop.
 * Multi-binding (bindIndex > 0) maps to type-specific indexed props.
 */
export function applyBindingsToProps(
  props: Record<string, unknown>,
  projected: ProjectedBinding[],
  nodeType: string,
): Record<string, unknown> {
  if (projected.length === 0)
    return props

  const result = { ...props }

  for (const binding of projected) {
    if (binding.value === undefined)
      continue

    const propKey = binding.bindIndex === 0
      ? getPrimaryBindProp(nodeType)
      : getIndexedBindProp(nodeType, binding.bindIndex)

    if (propKey) {
      // Bindings deliver raw data values (any JS type), but material renderers
      // assume their primary content prop is a string. Coerce here at the
      // boundary so renderers can rely on `String.prototype` methods.
      result[propKey] = binding.value == null ? '' : String(binding.value)
      if (nodeType === 'text' && binding.bindIndex === 0 && binding.hasFormatAffix) {
        result.prefix = ''
        result.suffix = ''
      }
    }
  }

  return result
}

const PRIMARY_BIND_MAP: Record<string, string> = {
  text: 'content',
  image: 'src',
  barcode: 'value',
  qrcode: 'value',
}

function getPrimaryBindProp(nodeType: string): string {
  return PRIMARY_BIND_MAP[nodeType] || 'content'
}

const INDEXED_BIND_MAP: Record<string, Record<number, string>> = {
  barcode: { 0: 'value', 1: 'format', 2: 'params' },
}

function getIndexedBindProp(nodeType: string, index: number): string | undefined {
  return INDEXED_BIND_MAP[nodeType]?.[index]
}
