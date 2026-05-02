import { describe, expect, it } from 'vitest'
import { clamp, deepClone, escapeHtml, generateId, normalizeFieldPath, resolveFieldPath, roundTo } from './utils'

describe('deepClone', () => {
  it('clones a plain object', () => {
    const obj = { a: 1, b: 'hello' }
    const copy = deepClone(obj)
    expect(copy).toEqual(obj)
    expect(copy).not.toBe(obj)
  })

  it('clones an array', () => {
    const arr = [1, 2, 3]
    const copy = deepClone(arr)
    expect(copy).toEqual(arr)
    expect(copy).not.toBe(arr)
  })

  it('returns null as-is', () => {
    expect(deepClone(null)).toBe(null)
  })

  it('returns primitives as-is', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('str')).toBe('str')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it('deep clones nested structures', () => {
    const obj = { a: { b: { c: [1, 2, { d: 3 }] } } }
    const copy = deepClone(obj)
    expect(copy).toEqual(obj)
    expect(copy.a).not.toBe(obj.a)
    expect(copy.a.b).not.toBe(obj.a.b)
    expect(copy.a.b.c).not.toBe(obj.a.b.c)
  })
})

describe('resolveFieldPath', () => {
  it('resolves a simple top-level key', () => {
    expect(resolveFieldPath({ name: 'Alice' }, 'name')).toBe('Alice')
  })

  it('resolves a nested dot path', () => {
    expect(resolveFieldPath({ a: { b: { c: 'value' } } }, 'a.b.c')).toBe('value')
  })

  it('resolves a slash-separated path', () => {
    expect(resolveFieldPath({ a: { b: 10 } }, 'a/b')).toBe(10)
  })

  it('returns undefined for empty path', () => {
    expect(resolveFieldPath({ a: 1 }, '')).toBeUndefined()
  })

  it('returns undefined for null object', () => {
    expect(resolveFieldPath(null, 'a')).toBeUndefined()
  })

  it('blocks __proto__', () => {
    expect(resolveFieldPath({}, '__proto__')).toBeUndefined()
  })

  it('blocks constructor', () => {
    expect(resolveFieldPath({}, 'constructor')).toBeUndefined()
  })

  it('blocks prototype', () => {
    expect(resolveFieldPath({}, 'prototype')).toBeUndefined()
  })

  it('returns undefined when path traverses a non-object', () => {
    expect(resolveFieldPath({ a: 42 }, 'a.b')).toBeUndefined()
  })
})

describe('normalizeFieldPath', () => {
  it('converts dots to slashes', () => {
    expect(normalizeFieldPath('a.b.c')).toBe('a/b/c')
  })

  it('leaves slashes unchanged', () => {
    expect(normalizeFieldPath('a/b/c')).toBe('a/b/c')
  })

  it('handles mixed separators', () => {
    expect(normalizeFieldPath('a.b/c.d')).toBe('a/b/c/d')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters consistently', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeHtml('EasyInk')).toBe('EasyInk')
  })
})

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('roundTo', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14)
  })

  it('rounds to 0 decimal places', () => {
    expect(roundTo(3.7, 0)).toBe(4)
  })

  it('rounds to 4 decimal places', () => {
    expect(roundTo(1.23456789, 4)).toBe(1.2346)
  })
})

describe('generateId', () => {
  it('returns a string starting with the default prefix', () => {
    const id = generateId()
    expect(id).toMatch(/^ei_/)
  })

  it('uses a custom prefix', () => {
    const id = generateId('node')
    expect(id).toMatch(/^node_/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
