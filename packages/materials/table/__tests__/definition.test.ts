import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { tableDefinition } from '../src/definition'
import { tablePropSchemas } from '../src/props'

describe('tableDefinition', () => {
  it('should have correct type and name', () => {
    expect(tableDefinition.type).toBe('table')
    expect(tableDefinition.name).toBe('表格')
  })

  it('should be in table category', () => {
    expect(tableDefinition.category).toBe('table')
  })

  it('should not be a container and not support repeat', () => {
    expect(tableDefinition.isContainer).toBe(false)
    expect(tableDefinition.supportsRepeat).toBe(false)
  })

  it('should default to flow positioning', () => {
    expect(tableDefinition.defaultLayout.position).toBe('flow')
  })

  it('should have default columns and rowCount', () => {
    expect(tableDefinition.defaultProps.columns).toBeDefined()
    expect((tableDefinition.defaultProps.columns as unknown[]).length).toBe(2)
    expect(tableDefinition.defaultProps.rowCount).toBe(3)
    expect(tableDefinition.defaultProps.cells).toEqual({})
  })

  it('should have bordered and borderStyle props', () => {
    const borderedProp = tableDefinition.propSchemas.find(p => p.key === 'bordered')
    const borderStyleProp = tableDefinition.propSchemas.find(p => p.key === 'borderStyle')
    expect(borderedProp).toBeDefined()
    expect(borderStyleProp).toBeDefined()
    expect(borderStyleProp!.defaultValue).toBe('solid')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(tableDefinition)).not.toThrow()
    expect(registry.has('table')).toBe(true)
  })
})

describe('tablePropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(tablePropSchemas)).toBe(true)
    expect(tablePropSchemas.length).toBe(2)
  })
})
