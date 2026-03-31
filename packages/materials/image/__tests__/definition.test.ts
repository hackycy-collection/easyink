import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { imageDefinition } from '../src/definition'
import { imagePropSchemas } from '../src/props'

describe('imageDefinition', () => {
  it('should have correct type and name', () => {
    expect(imageDefinition.type).toBe('image')
    expect(imageDefinition.name).toBe('图片')
  })

  it('should have icon and category', () => {
    expect(imageDefinition.icon).toBe('image')
    expect(imageDefinition.category).toBe('basic')
  })

  it('should have src and fit prop schemas', () => {
    const srcProp = imageDefinition.propSchemas.find(p => p.key === 'src')
    const fitProp = imageDefinition.propSchemas.find(p => p.key === 'fit')
    expect(srcProp).toBeDefined()
    expect(fitProp).toBeDefined()
    expect(fitProp!.defaultValue).toBe('contain')
  })

  it('should have defaultProps', () => {
    expect(imageDefinition.defaultProps).toEqual({
      src: '',
      fit: 'contain',
      alt: '',
    })
  })

  it('should default to absolute positioning', () => {
    expect(imageDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(imageDefinition)).not.toThrow()
    expect(registry.has('image')).toBe(true)
  })
})

describe('imagePropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(imagePropSchemas)).toBe(true)
    expect(imagePropSchemas.length).toBe(3)
  })

  it('should have all schemas with group', () => {
    for (const schema of imagePropSchemas) {
      expect(schema.group).toBe('图片')
    }
  })
})
