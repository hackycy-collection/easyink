import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { textDefinition } from '../src/definition'
import { textPropSchemas } from '../src/props'

describe('textDefinition', () => {
  it('should have correct type and name', () => {
    expect(textDefinition.type).toBe('text')
    expect(textDefinition.name).toBe('文本')
  })

  it('should have icon and category', () => {
    expect(textDefinition.icon).toBe('text')
    expect(textDefinition.category).toBe('basic')
  })

  it('should have content prop schema', () => {
    const contentProp = textDefinition.propSchemas.find(p => p.key === 'content')
    expect(contentProp).toBeDefined()
    expect(contentProp!.type).toBe('string')
  })

  it('should have all expected prop schemas', () => {
    const keys = textDefinition.propSchemas.map(p => p.key)
    expect(keys).toContain('content')
    expect(keys).toContain('verticalAlign')
    expect(keys).toContain('wordBreak')
    expect(keys).toContain('overflow')
  })

  it('should have defaultProps', () => {
    expect(textDefinition.defaultProps).toEqual({
      content: '',
      verticalAlign: 'top',
      wordBreak: 'normal',
      overflow: 'visible',
    })
  })

  it('should default to absolute positioning', () => {
    expect(textDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should have default font style', () => {
    expect(textDefinition.defaultStyle).toBeDefined()
    expect(textDefinition.defaultStyle!.fontSize).toBe(14)
    expect(textDefinition.defaultStyle!.color).toBe('#000000')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(textDefinition)).not.toThrow()
    expect(registry.has('text')).toBe(true)
  })
})

describe('textPropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(textPropSchemas)).toBe(true)
    expect(textPropSchemas.length).toBe(4)
  })

  it('should have all schemas with group', () => {
    for (const schema of textPropSchemas) {
      expect(schema.group).toBe('文本')
    }
  })
})
