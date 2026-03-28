import type { DataSourceRegistration } from '../types'
import { describe, expect, it } from 'vitest'
import { DataSourceManager } from '../manager'

const orderSource: DataSourceRegistration = {
  displayName: '订单数据',
  icon: 'order-icon',
  fields: [
    { key: 'orderNo', title: '订单号' },
    {
      title: '客户信息',
      children: [
        { key: 'customerName', title: '客户名称' },
        { key: 'customerPhone', title: '联系电话' },
      ],
    },
    {
      title: '订单明细',
      children: [
        { key: 'itemName', title: '商品名称', fullPath: 'orderItems.itemName' },
        { key: 'itemQty', title: '数量', fullPath: 'orderItems.itemQty' },
        { key: 'itemPrice', title: '单价', fullPath: 'orderItems.itemPrice' },
      ],
    },
  ],
}

const companySource: DataSourceRegistration = {
  displayName: '公司信息',
  icon: 'company-icon',
  fields: [
    { key: 'companyName', title: '公司名称' },
    { key: 'companyAddress', title: '公司地址' },
  ],
}

describe('dataSourceManager', () => {
  describe('register', () => {
    it('should register a data source', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      expect(manager.has('order')).toBe(true)
      expect(manager.get('order')).toBe(orderSource)
    })

    it('should overwrite on duplicate registration', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      const newSource: DataSourceRegistration = {
        displayName: '新订单',
        fields: [{ key: 'newField', title: '新字段' }],
      }
      manager.register('order', newSource)
      expect(manager.get('order')).toBe(newSource)
    })

    it('should emit registered event', () => {
      const manager = new DataSourceManager()
      const events: Array<{ name: string, reg: DataSourceRegistration }> = []
      manager.on('registered', (name, reg) => events.push({ name, reg }))
      manager.register('order', orderSource)
      expect(events).toEqual([{ name: 'order', reg: orderSource }])
    })

    it('should throw if leaf key contains dot', () => {
      const manager = new DataSourceManager()
      const badSource: DataSourceRegistration = {
        displayName: 'Bad',
        fields: [{ key: 'bad.key', title: 'Bad' }],
      }
      expect(() => manager.register('bad', badSource)).toThrow('must not contain')
    })

    it('should throw if nested leaf key contains dot', () => {
      const manager = new DataSourceManager()
      const badSource: DataSourceRegistration = {
        displayName: 'Bad',
        fields: [
          {
            title: 'Group',
            children: [{ key: 'nested.bad', title: 'Bad' }],
          },
        ],
      }
      expect(() => manager.register('bad', badSource)).toThrow('must not contain')
    })
  })

  describe('unregister', () => {
    it('should unregister a data source', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      manager.unregister('order')
      expect(manager.has('order')).toBe(false)
    })

    it('should throw if not found', () => {
      const manager = new DataSourceManager()
      expect(() => manager.unregister('nonexistent')).toThrow('not registered')
    })

    it('should emit unregistered event', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      const events: string[] = []
      manager.on('unregistered', name => events.push(name))
      manager.unregister('order')
      expect(events).toEqual(['order'])
    })
  })

  describe('list', () => {
    it('should return all registered sources', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      manager.register('company', companySource)
      const list = manager.list()
      expect(list).toEqual([
        { name: 'order', registration: orderSource },
        { name: 'company', registration: companySource },
      ])
    })

    it('should return empty array when none registered', () => {
      const manager = new DataSourceManager()
      expect(manager.list()).toEqual([])
    })
  })

  describe('getFields', () => {
    it('should return the fields array', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      const fields = manager.getFields('order')
      expect(fields).toBe(orderSource.fields)
    })

    it('should throw if source not found', () => {
      const manager = new DataSourceManager()
      expect(() => manager.getFields('nonexistent')).toThrow('not registered')
    })
  })

  describe('getFieldTree', () => {
    it('should return tree for all sources', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      manager.register('company', companySource)
      const tree = manager.getFieldTree()
      expect(tree).toHaveLength(2)
      expect(tree[0]).toEqual({
        name: 'order',
        displayName: '订单数据',
        icon: 'order-icon',
        fields: orderSource.fields,
      })
      expect(tree[1]).toEqual({
        name: 'company',
        displayName: '公司信息',
        icon: 'company-icon',
        fields: companySource.fields,
      })
    })

    it('should return empty array when none registered', () => {
      const manager = new DataSourceManager()
      expect(manager.getFieldTree()).toEqual([])
    })
  })

  describe('off', () => {
    it('should remove event listener', () => {
      const manager = new DataSourceManager()
      const events: string[] = []
      const listener = (name: string) => events.push(name)
      manager.on('registered', listener)
      manager.register('order', orderSource)
      manager.off('registered', listener)
      manager.register('company', companySource)
      expect(events).toEqual(['order'])
    })
  })

  describe('clear', () => {
    it('should clear all sources and listeners', () => {
      const manager = new DataSourceManager()
      manager.register('order', orderSource)
      const events: string[] = []
      manager.on('registered', name => events.push(name))
      manager.clear()

      expect(manager.list()).toEqual([])
      // Listener was cleared too — registering again should not fire
      manager.register('order', orderSource)
      expect(events).toEqual([])
    })
  })
})
