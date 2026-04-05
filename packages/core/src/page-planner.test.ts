import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import { describe, expect, it } from 'vitest'
import { createPagePlan } from './page-planner'

function makeNode(id: string, overrides: Partial<MaterialNode> = {}): MaterialNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    props: {},
    ...overrides,
  }
}

function makeSchema(pageOverrides: Partial<DocumentSchema['page']>, elements: MaterialNode[] = []): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: { mode: 'fixed', width: 210, height: 297, ...pageOverrides },
    guides: { x: [], y: [] },
    elements,
  }
}

describe('createPagePlan', () => {
  describe('fixed mode', () => {
    it('creates a single page with all elements', () => {
      const schema = makeSchema(
        { mode: 'fixed' },
        [makeNode('a'), makeNode('b')],
      )
      const plan = createPagePlan(schema)
      expect(plan.mode).toBe('fixed')
      expect(plan.pages).toHaveLength(1)
      expect(plan.pages[0]!.elements).toHaveLength(2)
      expect(plan.pages[0]!.width).toBe(210)
      expect(plan.pages[0]!.height).toBe(297)
    })

    it('creates empty page plan for no elements', () => {
      const schema = makeSchema({ mode: 'fixed' })
      const plan = createPagePlan(schema)
      expect(plan.pages).toHaveLength(1)
      expect(plan.pages[0]!.elements).toHaveLength(0)
    })
  })

  describe('stack mode', () => {
    it('creates single continuous page', () => {
      const schema = makeSchema(
        { mode: 'stack' },
        [makeNode('a', { y: 0, height: 100 }), makeNode('b', { y: 200, height: 150 })],
      )
      const plan = createPagePlan(schema)
      expect(plan.mode).toBe('stack')
      expect(plan.pages).toHaveLength(1)
      expect(plan.pages[0]!.height).toBe(350)
      expect(plan.pages[0]!.elements).toHaveLength(2)
    })

    it('uses page height as minimum', () => {
      const schema = makeSchema(
        { mode: 'stack', height: 500 },
        [makeNode('a', { y: 0, height: 50 })],
      )
      const plan = createPagePlan(schema)
      expect(plan.pages[0]!.height).toBe(500)
    })
  })

  describe('label mode', () => {
    it('creates entries per copy with computed label width', () => {
      const schema = makeSchema({
        mode: 'label',
        width: 210,
        label: { columns: 3, gap: 5 },
        copies: 6,
      }, [makeNode('a')])
      const plan = createPagePlan(schema)
      expect(plan.mode).toBe('label')
      expect(plan.pages).toHaveLength(6)

      const expectedWidth = (210 - 5 * 2) / 3
      expect(plan.pages[0]!.width).toBeCloseTo(expectedWidth, 5)
    })

    it('defaults to 1 column and 1 copy', () => {
      const schema = makeSchema({ mode: 'label' }, [makeNode('a')])
      const plan = createPagePlan(schema)
      expect(plan.pages).toHaveLength(1)
      expect(plan.pages[0]!.width).toBe(210)
    })
  })
})
