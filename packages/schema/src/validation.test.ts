import { describe, expect, it } from 'vitest'
import { validateSchema } from './validation'

describe('validateSchema', () => {
  const validSchema = {
    version: '1.0.0',
    unit: 'mm',
    page: { mode: 'fixed', width: 210, height: 297 },
    guides: { x: [], y: [] },
    elements: [],
  }

  it('returns empty array for a valid schema', () => {
    expect(validateSchema(validSchema)).toEqual([])
  })

  it('catches missing version', () => {
    const { version, ...rest } = validSchema
    const errors = validateSchema(rest)
    expect(errors.some(e => e.includes('version'))).toBe(true)
  })

  it('catches missing page', () => {
    const { page, ...rest } = validSchema
    const errors = validateSchema(rest)
    expect(errors.some(e => e.includes('page'))).toBe(true)
  })

  it('catches missing guides', () => {
    const { guides, ...rest } = validSchema
    const errors = validateSchema(rest)
    expect(errors.some(e => e.includes('guides'))).toBe(true)
  })

  it('catches missing elements', () => {
    const { elements, ...rest } = validSchema
    const errors = validateSchema(rest)
    expect(errors.some(e => e.includes('elements'))).toBe(true)
  })

  it('catches non-object schema', () => {
    const errors = validateSchema('not an object')
    expect(errors).toContain('Schema must be an object')
  })

  it('catches missing unit', () => {
    const { unit, ...rest } = validSchema
    const errors = validateSchema(rest)
    expect(errors.some(e => e.includes('unit'))).toBe(true)
  })
})
