import { MaterialRegistry } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { barcodeDefinition } from '../src/definition'
import { barcodePropSchemas } from '../src/props'

describe('barcodeDefinition', () => {
  it('should have correct type and name', () => {
    expect(barcodeDefinition.type).toBe('barcode')
    expect(barcodeDefinition.name).toBe('条形码')
  })

  it('should have format prop with all barcode formats', () => {
    const formatProp = barcodeDefinition.propSchemas.find(p => p.key === 'format')
    expect(formatProp).toBeDefined()
    expect(formatProp!.defaultValue).toBe('CODE128')
    const values = formatProp!.enum!.map(e => e.value)
    expect(values).toContain('QR')
    expect(values).toContain('CODE128')
    expect(values).toContain('EAN13')
  })

  it('should hide errorCorrectionLevel when format is not QR', () => {
    const ecProp = barcodeDefinition.propSchemas.find(p => p.key === 'errorCorrectionLevel')
    expect(ecProp?.visible).toBeDefined()
    expect(ecProp!.visible!({ format: 'CODE128' })).toBe(false)
    expect(ecProp!.visible!({ format: 'QR' })).toBe(true)
  })

  it('should have defaultProps', () => {
    expect(barcodeDefinition.defaultProps).toEqual({
      format: 'CODE128',
      value: '',
      displayValue: true,
      barWidth: 2,
      errorCorrectionLevel: 'M',
    })
  })

  it('should default to absolute positioning', () => {
    expect(barcodeDefinition.defaultLayout.position).toBe('absolute')
  })

  it('should be registrable in MaterialRegistry', () => {
    const registry = new MaterialRegistry()
    expect(() => registry.register(barcodeDefinition)).not.toThrow()
    expect(registry.has('barcode')).toBe(true)
  })
})

describe('barcodePropSchemas', () => {
  it('should export propSchemas array', () => {
    expect(Array.isArray(barcodePropSchemas)).toBe(true)
    expect(barcodePropSchemas.length).toBe(5)
  })
})
