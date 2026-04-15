import { describe, expect, it } from 'vitest'
import { extractCollectionPath, resolveBindingValue, resolveFieldFromRecord, resolveNodeBindings } from './binding-utils'

describe('resolveBindingValue', () => {
  it('resolves a simple field path', () => {
    const binding = { sourceId: 's1', fieldPath: 'name' }
    const data = { name: 'John' }
    expect(resolveBindingValue(binding, data)).toBe('John')
  })

  it('resolves a nested field path', () => {
    const binding = { sourceId: 's1', fieldPath: 'user/name' }
    const data = { user: { name: 'Jane' } }
    expect(resolveBindingValue(binding, data)).toBe('Jane')
  })

  it('returns undefined for missing path', () => {
    const binding = { sourceId: 's1', fieldPath: 'missing/path' }
    const data = { name: 'John' }
    expect(resolveBindingValue(binding, data)).toBeUndefined()
  })

  it('blocks __proto__ access', () => {
    const binding = { sourceId: 's1', fieldPath: '__proto__/toString' }
    const data = { name: 'John' }
    expect(resolveBindingValue(binding, data)).toBeUndefined()
  })

  it('blocks constructor access', () => {
    const binding = { sourceId: 's1', fieldPath: 'constructor' }
    const data = { name: 'John' }
    expect(resolveBindingValue(binding, data)).toBeUndefined()
  })

  it('returns undefined for empty fieldPath', () => {
    const binding = { sourceId: 's1', fieldPath: '' }
    expect(resolveBindingValue(binding, { a: 1 })).toBeUndefined()
  })
})

describe('resolveNodeBindings', () => {
  it('resolves single binding', () => {
    const bindings = { sourceId: 's1', fieldPath: 'name' }
    const data = { name: 'John' }
    const result = resolveNodeBindings(bindings, data)
    expect(result.get(0)).toBe('John')
  })

  it('resolves multiple bindings with bind index', () => {
    const bindings = [
      { sourceId: 's1', fieldPath: 'a', bindIndex: 0 },
      { sourceId: 's1', fieldPath: 'b', bindIndex: 1 },
    ]
    const data = { a: 'val-a', b: 'val-b' }
    const result = resolveNodeBindings(bindings, data)
    expect(result.get(0)).toBe('val-a')
    expect(result.get(1)).toBe('val-b')
  })

  it('returns empty map for undefined bindings', () => {
    const result = resolveNodeBindings(undefined, {})
    expect(result.size).toBe(0)
  })
})

describe('extractCollectionPath', () => {
  it('extracts common collection from same-prefix paths', () => {
    expect(extractCollectionPath(['items/name', 'items/qty', 'items/price'])).toBe('items')
  })

  it('extracts nested collection path', () => {
    expect(extractCollectionPath(['orders/items/name', 'orders/items/qty'])).toBe('orders/items')
  })

  it('returns undefined for empty array', () => {
    expect(extractCollectionPath([])).toBeUndefined()
  })

  it('returns undefined for mismatched prefixes', () => {
    expect(extractCollectionPath(['items/name', 'orders/qty'])).toBeUndefined()
  })

  it('returns undefined for single-segment paths (no collection)', () => {
    expect(extractCollectionPath(['standalone'])).toBeUndefined()
  })

  it('works with single path', () => {
    expect(extractCollectionPath(['items/name'])).toBe('items')
  })
})

describe('resolveFieldFromRecord', () => {
  it('resolves a simple field', () => {
    expect(resolveFieldFromRecord('name', { name: 'Pen' })).toBe('Pen')
  })

  it('resolves a nested field', () => {
    expect(resolveFieldFromRecord('nested/field', { nested: { field: 42 } })).toBe(42)
  })

  it('returns undefined for empty leaf', () => {
    expect(resolveFieldFromRecord('', { a: 1 })).toBeUndefined()
  })

  it('returns undefined for missing field', () => {
    expect(resolveFieldFromRecord('missing', { a: 1 })).toBeUndefined()
  })

  it('blocks __proto__ access', () => {
    expect(resolveFieldFromRecord('__proto__', {})).toBeUndefined()
  })
})
