import { describe, expect, it, vi } from 'vitest'
import { DataResolver } from '../resolver'

const sampleData: Record<string, unknown> = {
  orderNo: 'ORD-001',
  customerName: '张三',
  customerPhone: '13800138000',
  companyName: 'ACME 公司',
  companyAddress: '北京市朝阳区',
  total: 250,
  orderItems: [
    { itemName: '商品A', itemQty: 2, itemPrice: 100, itemAmount: 200 },
    { itemName: '商品B', itemQty: 1, itemPrice: 50, itemAmount: 50 },
  ],
}

describe('dataResolver', () => {
  describe('resolve — flat key', () => {
    it('should resolve a flat scalar key', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('orderNo', sampleData)).toBe('ORD-001')
    })

    it('should resolve a flat numeric key', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('total', sampleData)).toBe(250)
    })

    it('should resolve a flat array key', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('orderItems', sampleData)).toBe(sampleData.orderItems)
    })

    it('should return undefined for missing flat key', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('nonexistent', sampleData)).toBeUndefined()
    })

    it('should return undefined for empty path', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('', sampleData)).toBeUndefined()
    })

    it('should prefer flat key over dot-path when key exists in data', () => {
      const resolver = new DataResolver()
      const data: Record<string, unknown> = {
        'a.b': 'flat-value',
        'a': [{ b: 'dot-value' }],
      }
      // Note: 'a.b' key contains dot — this is in user data, not in registration keys.
      // Flat-first: 'a.b' in data → returns 'flat-value'
      expect(resolver.resolve('a.b', data)).toBe('flat-value')
    })
  })

  describe('resolve — dot-path (array.field)', () => {
    it('should resolve array.field to mapped array', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('orderItems.itemName', sampleData)).toEqual(['商品A', '商品B'])
    })

    it('should resolve array.field for numeric fields', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('orderItems.itemPrice', sampleData)).toEqual([100, 50])
    })

    it('should return undefined for each item missing the field', () => {
      const resolver = new DataResolver()
      const data: Record<string, unknown> = {
        items: [
          { a: 1 },
          { b: 2 },
        ],
      }
      expect(resolver.resolve('items.a', data)).toEqual([1, undefined])
    })

    it('should handle null/undefined items in the array', () => {
      const resolver = new DataResolver()
      const data: Record<string, unknown> = {
        items: [null, { name: 'test' }, undefined],
      }
      expect(resolver.resolve('items.name', data)).toEqual([undefined, 'test', undefined])
    })

    it('should handle primitive items in the array', () => {
      const resolver = new DataResolver()
      const data: Record<string, unknown> = {
        items: [1, 2, 3],
      }
      expect(resolver.resolve('items.name', data)).toEqual([undefined, undefined, undefined])
    })

    it('should return empty array for empty source array', () => {
      const resolver = new DataResolver()
      const data: Record<string, unknown> = {
        items: [],
      }
      expect(resolver.resolve('items.name', data)).toEqual([])
    })

    it('should return undefined when arrayKey not in data', () => {
      const resolver = new DataResolver()
      expect(resolver.resolve('missing.field', sampleData)).toBeUndefined()
    })

    it('should throw when arrayKey value is not an array', () => {
      const resolver = new DataResolver()
      expect(() => resolver.resolve('customerName.field', sampleData))
        .toThrow('Expected data["customerName"] to be an array')
    })

    it('should throw when dot-path has more than 2 segments', () => {
      const resolver = new DataResolver()
      expect(() => resolver.resolve('a.b.c', sampleData))
        .toThrow('more than 2 segments')
    })
  })

  describe('security — prototype pollution prevention', () => {
    it('should block __proto__ as flat key', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('__proto__', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('__proto__'))
      spy.mockRestore()
    })

    it('should block constructor as flat key', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('constructor', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('constructor'))
      spy.mockRestore()
    })

    it('should block prototype as flat key', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('prototype', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('prototype'))
      spy.mockRestore()
    })

    it('should block __proto__ as arrayKey in dot-path', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('__proto__.field', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('__proto__'))
      spy.mockRestore()
    })

    it('should block __proto__ as field in dot-path', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('orderItems.__proto__', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('__proto__'))
      spy.mockRestore()
    })

    it('should block constructor as field in dot-path', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.resolve('orderItems.constructor', sampleData)).toBeUndefined()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('constructor'))
      spy.mockRestore()
    })
  })

  describe('format', () => {
    it('should format value with registered formatter', () => {
      const resolver = new DataResolver()
      resolver.registerFormatter('uppercase', value => String(value ?? '').toUpperCase())
      expect(resolver.format('hello', { type: 'uppercase' })).toBe('HELLO')
    })

    it('should return string value if formatter not found', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.format(42, { type: 'unknown' })).toBe('42')
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown formatter'))
      spy.mockRestore()
    })

    it('should return empty string for null value if formatter not found', () => {
      const resolver = new DataResolver()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(resolver.format(null, { type: 'unknown' })).toBe('')
      spy.mockRestore()
    })
  })

  describe('resolveAndFormat', () => {
    it('should resolve and format in one call', () => {
      const resolver = new DataResolver()
      resolver.registerFormatter('uppercase', value => String(value ?? '').toUpperCase())
      const result = resolver.resolveAndFormat('orderNo', sampleData, { type: 'uppercase' })
      expect(result).toBe('ORD-001')
    })

    it('should return string value without formatter', () => {
      const resolver = new DataResolver()
      expect(resolver.resolveAndFormat('total', sampleData)).toBe('250')
    })

    it('should return empty string for undefined without formatter', () => {
      const resolver = new DataResolver()
      expect(resolver.resolveAndFormat('nonexistent', sampleData)).toBe('')
    })
  })

  describe('formatter registration', () => {
    it('should register and unregister formatters', () => {
      const resolver = new DataResolver()
      const fn = (v: unknown) => String(v)
      resolver.registerFormatter('test', fn)
      expect(resolver.hasFormatter('test')).toBe(true)
      resolver.unregisterFormatter('test')
      expect(resolver.hasFormatter('test')).toBe(false)
    })

    it('should clear all formatters', () => {
      const resolver = new DataResolver()
      resolver.registerFormatter('a', v => String(v))
      resolver.registerFormatter('b', v => String(v))
      resolver.clear()
      expect(resolver.hasFormatter('a')).toBe(false)
      expect(resolver.hasFormatter('b')).toBe(false)
    })
  })
})
