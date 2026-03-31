import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { lineDefinition } from '../src/definition'
import { linePropSchemas } from '../src/props'

describe('lineDefinition', () => {
  it('should have correct type and name', () => {
    expect(lineDefinition.type).toBe('line')
    expect(lineDefinition.name).toBe('线条')
  })

  it('should have direction and stroke props', () => {
    const directionProp = lineDefinition.propSchemas.find(p => p.key === 'direction')
    const strokeWidthProp = lineDefinition.propSchemas.find(p => p.key === 'strokeWidth')
    expect(directionProp).toBeDefined()
    expect(directionProp!.defaultValue).toBe('horizontal')
    expect(strokeWidthProp).toBeDefined()
  })

  it('should hide endX/endY when direction is not custom', () => {
    const endXProp = lineDefinition.propSchemas.find(p => p.key === 'endX')
    const endYProp = lineDefinition.propSchemas.find(p => p.key === 'endY')
    expect(endXProp?.visible).toBeDefined()
    expect(endXProp!.visible!({ direction: 'horizontal' })).toBe(false)
    expect(endXProp!.visible!({ direction: 'custom' })).toBe(true)
    expect(endYProp!.visible!({ direction: 'custom' })).toBe(true)
  })

  it('should have defaultProps', () => {
    expect(lineDefinition.defaultProps).toEqual({
      direction: 'horizontal',
      strokeWidth: 1,
      strokeColor: '#000000',
      strokeStyle: 'solid',
    })
  })

  it('should default to absolute positioning', () => {
    expect(lineDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(lineDefinition)).not.toThrow()
    expect(registry.has('line')).toBe(true)
  })
})

describe('linePropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(linePropSchemas)).toBe(true)
    expect(linePropSchemas.length).toBe(6)
  })
})
