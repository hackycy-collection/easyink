import type { DocumentSchema } from './types'
import { describe, expect, it } from 'vitest'
import { createDefaultSchema, normalizeDocumentSchema } from './defaults'

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

describe('normalizeDocumentSchema', () => {
  it('accepts DocumentSchema with no required fields', () => {
    const input: DocumentSchema = { page: { width: 80 } }
    const schema = normalizeDocumentSchema(input)

    expect(schema.page).toMatchObject({ mode: 'fixed', width: 80, height: 297 })
  })

  it('returns a default schema for an empty input object', () => {
    const schema = normalizeDocumentSchema({})

    expect(schema).toMatchObject(createDefaultSchema())
  })

  it('preserves valid schema identity', () => {
    const schema = createDefaultSchema()

    expect(normalizeDocumentSchema(schema)).toBe(schema)
  })

  it('fills missing document, page, and guide fields without discarding valid input', () => {
    const schema = normalizeDocumentSchema({
      unit: 'px',
      page: { width: 80 },
      guides: { x: [10] },
    })

    expect(schema.unit).toBe('px')
    expect(schema.page).toMatchObject({ mode: 'fixed', width: 80, height: 297 })
    expect(schema.guides).toEqual({ x: [10], y: [] })
    expect(schema.elements).toEqual([])
  })

  it('falls back required fields with invalid values', () => {
    const schema = normalizeDocumentSchema({
      unit: 'cm' as never,
      page: { mode: 'book' as never, width: 0, height: -1 },
      guides: { x: 'bad' as never, y: [20] },
      elements: 'bad' as never,
    })

    expect(schema.unit).toBe('mm')
    expect(schema.page).toMatchObject({ mode: 'fixed', width: 210, height: 297 })
    expect(schema.guides).toEqual({ x: [], y: [20] })
    expect(schema.elements).toEqual([])
  })
})
