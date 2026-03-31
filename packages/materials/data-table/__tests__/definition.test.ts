import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { dataTableDefinition } from '../src/definition'
import { dataTablePropSchemas } from '../src/props'

describe('dataTableDefinition', () => {
  it('should have correct type and name', () => {
    expect(dataTableDefinition.type).toBe('data-table')
    expect(dataTableDefinition.name).toBe('数据表格')
  })

  it('should be in table category', () => {
    expect(dataTableDefinition.category).toBe('table')
  })

  it('should be a container that supports repeat', () => {
    expect(dataTableDefinition.isContainer).toBe(true)
    expect(dataTableDefinition.supportsRepeat).toBe(true)
  })

  it('should default to flow positioning', () => {
    expect(dataTableDefinition.defaultLayout.position).toBe('flow')
  })

  it('should default to empty columns array', () => {
    expect(dataTableDefinition.defaultProps.columns).toEqual([])
  })

  it('should have showHeader prop defaulting to true', () => {
    expect(dataTableDefinition.defaultProps.showHeader).toBe(true)
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(dataTableDefinition)).not.toThrow()
    expect(registry.has('data-table')).toBe(true)
  })
})

describe('dataTablePropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(dataTablePropSchemas)).toBe(true)
    expect(dataTablePropSchemas.length).toBe(4)
  })

  it('should have bordered, striped, rowHeight, showHeader', () => {
    const keys = dataTablePropSchemas.map(p => p.key)
    expect(keys).toContain('bordered')
    expect(keys).toContain('striped')
    expect(keys).toContain('rowHeight')
    expect(keys).toContain('showHeader')
  })
})
