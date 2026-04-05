import { describe, expect, it } from 'vitest'
import { createDefaultSchema } from './defaults'

describe('createDefaultSchema', () => {
  it('returns a schema with the current version', () => {
    const schema = createDefaultSchema()
    expect(schema.version).toBe('1.0.0')
  })

  it('uses mm as the default unit', () => {
    const schema = createDefaultSchema()
    expect(schema.unit).toBe('mm')
  })

  it('has page mode fixed', () => {
    const schema = createDefaultSchema()
    expect(schema.page.mode).toBe('fixed')
  })

  it('has A4 dimensions (210x297)', () => {
    const schema = createDefaultSchema()
    expect(schema.page.width).toBe(210)
    expect(schema.page.height).toBe(297)
  })

  it('has empty guides', () => {
    const schema = createDefaultSchema()
    expect(schema.guides).toEqual({ x: [], y: [] })
  })

  it('has empty elements array', () => {
    const schema = createDefaultSchema()
    expect(schema.elements).toEqual([])
  })
})
