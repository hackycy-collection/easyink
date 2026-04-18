import type { TableNode } from '@easyink/schema'
import { describe, expect, it } from 'vitest'
import { buildTableDataViewModel, buildTableStaticViewModel, memoViewModel } from './viewmodel'

function node(cols = 3, rows = 2, w = 90, h = 40): TableNode {
  return {
    id: 't1',
    type: 'table-static',
    x: 0,
    y: 0,
    width: w,
    height: h,
    props: {},
    table: {
      kind: 'static',
      topology: {
        columns: Array.from({ length: cols }, () => ({ ratio: 1 / cols })),
        rows: Array.from({ length: rows }, () => ({
          height: 10,
          role: 'normal' as const,
          cells: Array.from({ length: cols }, () => ({})),
        })),
      },
      layout: { borderAppearance: 'all', borderWidth: 1, borderType: 'solid', borderColor: '#000' },
    },
  } as unknown as TableNode
}

describe('viewmodel', () => {
  it('static: rows/cols width sums match element size', () => {
    const vm = buildTableStaticViewModel(node(3, 2, 90, 40))
    expect(vm.columns.length).toBe(3)
    expect(vm.rows.length).toBe(2)
    const sumW = vm.columns.reduce((s, c) => s + c.width, 0)
    expect(sumW).toBeCloseTo(90, 5)
    const sumH = vm.rows.reduce((s, r) => s + r.height, 0)
    expect(sumH).toBeCloseTo(40, 5)
  })

  it('static: hitTest returns grid cell + rectOf round-trips', () => {
    const vm = buildTableStaticViewModel(node(3, 2, 90, 40))
    // row 0 [0,20), row 1 [20,40); col 0 [0,30), col 1 [30,60), col 2 [60,90)
    const hit = vm.hitTest({ x: 45, y: 25 })
    expect(hit?.path[0]).toBe(1)
    expect(hit?.path[1]).toBe(1)
    expect(hit?.virtual).toBe(false)
    const rect = vm.rectOf([1, 1])!
    expect(rect.x).toBeCloseTo(30, 5)
    expect(rect.y).toBeCloseTo(20, 5)
  })

  it('static: hitTest out of bounds returns null', () => {
    const vm = buildTableStaticViewModel(node(2, 2, 40, 20))
    expect(vm.hitTest({ x: -1, y: 0 })).toBeNull()
    expect(vm.hitTest({ x: 0, y: 100 })).toBeNull()
  })

  it('data: equivalent to static (no virtual rows)', () => {
    const vm = buildTableDataViewModel(node(2, 2, 40, 40))
    expect(vm.rows.length).toBe(2)
    expect(vm.rows.every(r => !r.virtual)).toBe(true)
    const sumH = vm.rows.reduce((s, r) => s + r.height, 0)
    expect(sumH).toBeCloseTo(40, 5)
  })

  it('memoViewModel caches per (doc, nodeId)', () => {
    let calls = 0
    const getVM = memoViewModel<{ v: number }>((_doc, _id) => {
      calls++
      return { v: calls }
    })
    const doc1 = { elements: [] } as any
    const doc2 = { elements: [] } as any
    const v1 = getVM(doc1, 'a')
    const v1b = getVM(doc1, 'a')
    expect(v1).toBe(v1b)
    expect(calls).toBe(1)
    getVM(doc1, 'b')
    expect(calls).toBe(2)
    getVM(doc2, 'a')
    expect(calls).toBe(3)
  })

  it('resolves merge owner on hitTest', () => {
    const n = node(3, 3, 90, 30)
    // merge (0,0)~(1,1)
    const rows = n.table.topology.rows
    rows[0]!.cells[0] = { rowSpan: 2, colSpan: 2 }
    rows[0]!.cells[1] = {}
    rows[1]!.cells[0] = {}
    rows[1]!.cells[1] = {}
    const vm = buildTableStaticViewModel(n)
    const hit = vm.hitTest({ x: 45, y: 15 }) // 落在 (1,1)，解析后 → owner (0,0)
    expect(hit?.path[0]).toBe(0)
    expect(hit?.path[1]).toBe(0)
    expect(hit?.rawRow).toBe(1)
    expect(hit?.rawCol).toBe(1)
  })
})
