/**
 * @vitest-environment happy-dom
 */
import type { DocumentSchema, TableNode, TableTopologySchema } from '@easyink/schema'
import { createEditorState, emptySelection } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import {
  InsertColStep,
  InsertRowStep,
  MergeCellsStep,
  RemoveColStep,
  RemoveRowStep,
  ResizeColumnStep,
  ResizeRowStep,
  SetCellBindingStep,
  UpdateCellStep,
} from './steps'

function topo(cols: number, rows: number, rowH = 10): TableTopologySchema {
  return {
    columns: Array.from({ length: cols }, () => ({ ratio: 1 / cols })),
    rows: Array.from({ length: rows }, () => ({
      height: rowH,
      role: 'normal' as const,
      cells: Array.from({ length: cols }, () => ({})),
    })),
  }
}

function makeDoc(node: TableNode): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: { mode: 'fixed', width: 210, height: 297 },
    guides: { x: [], y: [] },
    elements: [node as any],
  }
}

function tableNode(id: string, cols = 3, rows = 2, kind: 'static' | 'data' = 'static'): TableNode {
  return {
    id,
    type: kind === 'static' ? 'table-static' : 'table-data',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    props: {},
    table: {
      kind,
      topology: topo(cols, rows),
      layout: { borderAppearance: 'all', borderWidth: 1, borderType: 'solid', borderColor: '#000' },
    },
  } as unknown as TableNode
}

function roundtrip(step: { apply: (d: DocumentSchema) => { doc?: DocumentSchema }, invert: (d: DocumentSchema) => any }, doc: DocumentSchema): DocumentSchema {
  const applied = step.apply(doc).doc!
  const inv = step.invert(doc)
  const reverted = inv.apply(applied).doc!
  return reverted
}

describe('table kernel steps', () => {
  it('insertRowStep: apply + invert', () => {
    const n = tableNode('t1', 3, 2)
    const doc = makeDoc(n)
    const step = new InsertRowStep('t1', 1)
    const applied = step.apply(doc).doc!
    const nn = applied.elements[0] as TableNode
    expect(nn.table.topology.rows.length).toBe(3)
    const reverted = roundtrip(step, doc)
    expect((reverted.elements[0] as TableNode).table.topology.rows.length).toBe(2)
  })

  it('removeRowStep: invert restores row content', () => {
    const n = tableNode('t1', 2, 3)
    // 给 row 1 写入特征值
    const doc0 = makeDoc(n)
    const doc1 = new UpdateCellStep('t1', 1, 0, 'content.text', 'hello').apply(doc0).doc!
    const step = new RemoveRowStep('t1', 1)
    const applied = step.apply(doc1).doc!
    expect((applied.elements[0] as TableNode).table.topology.rows.length).toBe(2)
    const inv = step.invert(doc1)
    const reverted = inv.apply(applied).doc!
    const cell = (reverted.elements[0] as TableNode).table.topology.rows[1]!.cells[0]!
    expect(cell.content?.text).toBe('hello')
  })

  it('insertColStep: rescales ratios to sum ~= 1', () => {
    const n = tableNode('t1', 2, 1)
    const doc = makeDoc(n)
    const step = new InsertColStep('t1', 1)
    const applied = step.apply(doc).doc!
    const cols = (applied.elements[0] as TableNode).table.topology.columns
    expect(cols.length).toBe(3)
    const sum = cols.reduce((s, c) => s + c.ratio, 0)
    expect(sum).toBeCloseTo(1, 5)
    // 每行也多了一列
    expect((applied.elements[0] as TableNode).table.topology.rows[0]!.cells.length).toBe(3)
  })

  it('removeColStep: removes cells & rescales', () => {
    const n = tableNode('t1', 3, 1)
    const doc = makeDoc(n)
    const step = new RemoveColStep('t1', 1)
    const applied = step.apply(doc).doc!
    const topology = (applied.elements[0] as TableNode).table.topology
    expect(topology.columns.length).toBe(2)
    expect(topology.rows[0]!.cells.length).toBe(2)
    const sum = topology.columns.reduce((s, c) => s + c.ratio, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('resizeColumnStep: borrows from neighbor + invert', () => {
    const n = tableNode('t1', 2, 1)
    const doc = makeDoc(n)
    const step = new ResizeColumnStep('t1', 0, 0.7)
    const applied = step.apply(doc).doc!
    const cols = (applied.elements[0] as TableNode).table.topology.columns
    expect(cols[0]!.ratio).toBeCloseTo(0.7, 5)
    expect(cols[1]!.ratio).toBeCloseTo(0.3, 5)
    const reverted = roundtrip(step, doc)
    const c0 = (reverted.elements[0] as TableNode).table.topology.columns[0]!.ratio
    expect(c0).toBeCloseTo(0.5, 5)
  })

  it('resizeRowStep: invert restores height', () => {
    const n = tableNode('t1', 1, 2)
    const doc = makeDoc(n)
    const step = new ResizeRowStep('t1', 0, 25)
    const applied = step.apply(doc).doc!
    expect((applied.elements[0] as TableNode).table.topology.rows[0]!.height).toBe(25)
    const reverted = roundtrip(step, doc)
    expect((reverted.elements[0] as TableNode).table.topology.rows[0]!.height).toBe(10)
  })

  it('updateCellStep: writes nested path + invert', () => {
    const n = tableNode('t1', 2, 2)
    const doc = makeDoc(n)
    const step = new UpdateCellStep('t1', 0, 1, 'content.text', 'foo')
    const applied = step.apply(doc).doc!
    const cell = (applied.elements[0] as TableNode).table.topology.rows[0]!.cells[1]!
    expect(cell.content?.text).toBe('foo')
    const reverted = roundtrip(step, doc)
    expect((reverted.elements[0] as TableNode).table.topology.rows[0]!.cells[1]!.content?.text).toBeUndefined()
  })

  it('mergeCellsStep / SplitCellStep: round-trip preserves inner cell content', () => {
    const n = tableNode('t1', 3, 3)
    const doc0 = makeDoc(n)
    // 给被合并区内的 (1,2) 写入内容
    const doc = new UpdateCellStep('t1', 1, 2, 'content.text', 'inner').apply(doc0).doc!
    const merge = new MergeCellsStep('t1', 1, 1, 2, 2)
    const merged = merge.apply(doc).doc!
    const mergedCell = (merged.elements[0] as TableNode).table.topology.rows[1]!.cells[1]!
    expect(mergedCell.rowSpan).toBe(2)
    expect(mergedCell.colSpan).toBe(2)
    // invert 回 split，应还原 (1,2) 的 content
    const inv = merge.invert(doc)
    const reverted = inv.apply(merged).doc!
    const cell12 = (reverted.elements[0] as TableNode).table.topology.rows[1]!.cells[2]!
    expect(cell12.content?.text).toBe('inner')
  })

  it('setCellBindingStep: writes field + invert clears', () => {
    const n = tableNode('t1', 2, 2, 'data')
    const doc = makeDoc(n)
    const step = new SetCellBindingStep('t1', 0, 1, 'binding', { path: 'name' })
    const applied = step.apply(doc).doc!
    const cell = (applied.elements[0] as TableNode).table.topology.rows[0]!.cells[1]!
    expect(cell.binding).toEqual({ path: 'name' })
    const reverted = roundtrip(step, doc)
    expect((reverted.elements[0] as TableNode).table.topology.rows[0]!.cells[1]!.binding).toBeUndefined()
  })

  it('structural step maps selection: insert-row shifts, remove-row drops', () => {
    const n = tableNode('t1', 2, 3)
    const doc = makeDoc(n)
    const state = createEditorState({ doc, plugins: [], selection: emptySelection() })
    // 构造 table-cell 选区
    const sel = {
      type: 'table-cell',
      nodeId: 't1',
      path: [1, 0] as const,
      toJSON: () => ({ type: 'table-cell', nodeId: 't1', path: [1, 0] }),
    }
    // insert row at 0 → row 1 变为 2
    const ins = new InsertRowStep('t1', 0)
    const mapped = ins.getMap().mapSelection(sel as any)
    expect(mapped?.path?.[0]).toBe(2)
    // remove row at 1 → drop
    const rm = new RemoveRowStep('t1', 1)
    const mapped2 = rm.getMap().mapSelection(sel as any)
    expect(mapped2).toBeNull()
    void state
  })
})
