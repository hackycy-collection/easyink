import { describe, expect, it } from 'vitest'
import { DesignerStore } from './designer-store'

describe('designer store schema initialization', () => {
  it('normalizes an empty schema input to a complete document schema', () => {
    const store = new DesignerStore({})

    expect(store.schema.unit).toBe('mm')
    expect(store.schema.page).toMatchObject({ mode: 'fixed', width: 210, height: 297 })
    expect(store.schema.guides).toEqual({ x: [], y: [] })
    expect(store.schema.elements).toEqual([])
  })

  it('normalizes partial schema replacements', () => {
    const store = new DesignerStore()

    store.setSchema({ page: { width: 80 } })

    expect(store.schema.page).toMatchObject({ mode: 'fixed', width: 80, height: 297 })
    expect(store.schema.guides).toEqual({ x: [], y: [] })
    expect(store.schema.elements).toEqual([])
  })
})
