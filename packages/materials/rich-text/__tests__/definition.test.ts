import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { richTextDefinition } from '../src/definition'
import { richTextPropSchemas } from '../src/props'

describe('richTextDefinition', () => {
  it('should have correct type and name', () => {
    expect(richTextDefinition.type).toBe('rich-text')
    expect(richTextDefinition.name).toBe('富文本')
  })

  it('should have icon and category', () => {
    expect(richTextDefinition.icon).toBe('rich-text')
    expect(richTextDefinition.category).toBe('basic')
  })

  it('should have content prop schema', () => {
    const contentProp = richTextDefinition.propSchemas.find(p => p.key === 'content')
    expect(contentProp).toBeDefined()
    expect(contentProp!.type).toBe('string')
  })

  it('should have defaultProps', () => {
    expect(richTextDefinition.defaultProps).toEqual({
      content: '',
      verticalAlign: 'top',
    })
  })

  it('should default to absolute positioning', () => {
    expect(richTextDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(richTextDefinition)).not.toThrow()
    expect(registry.has('rich-text')).toBe(true)
  })
})

describe('richTextPropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(richTextPropSchemas)).toBe(true)
    expect(richTextPropSchemas.length).toBe(2)
  })
})
