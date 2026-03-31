import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { rectDefinition } from '../src/definition'
import { rectPropSchemas } from '../src/props'

describe('rectDefinition', () => {
  it('should have correct type and name', () => {
    expect(rectDefinition.type).toBe('rect')
    expect(rectDefinition.name).toBe('矩形')
  })

  it('should have borderRadius and fill props', () => {
    const radiusProp = rectDefinition.propSchemas.find(p => p.key === 'borderRadius')
    const fillProp = rectDefinition.propSchemas.find(p => p.key === 'fill')
    expect(radiusProp).toBeDefined()
    expect(fillProp).toBeDefined()
    expect(radiusProp!.defaultValue).toBe(0)
    expect(fillProp!.defaultValue).toBe('transparent')
  })

  it('should have defaultProps', () => {
    expect(rectDefinition.defaultProps).toEqual({
      borderRadius: 0,
      fill: 'transparent',
    })
  })

  it('should default to absolute positioning', () => {
    expect(rectDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(rectDefinition)).not.toThrow()
    expect(registry.has('rect')).toBe(true)
  })
})

describe('rectPropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(rectPropSchemas)).toBe(true)
    expect(rectPropSchemas.length).toBe(2)
  })
})
