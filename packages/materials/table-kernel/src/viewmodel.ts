/**
 * ViewModel：Schema → 渲染/命中测试派生层。
 *
 * 见 `.github/architecture/22-editor-core.md` §22.9
 * 与 `.github/architecture/23-table-interaction.md` §23.8。
 *
 * Notion 范式重构后，table-data 不再注入虚拟占位行；repeat-template 行
 * 在设计态只渲染 schema 上实际存在的一行，循环效果由 designer 角标体现。
 * `ViewModel.rows[i].virtual` 字段保留但永远为 false（兼容下游代码）。
 */

import type { DocumentSchema, TableNode, TableTopologySchema } from '@easyink/schema'
import type { TableRowRole } from '@easyink/shared'
import { computeCellRect, computeColumnWidths, computeRowHeights, hitTestGridCell } from './geometry'
import { resolveMergeOwner } from './topology'

export interface ViewModelColumn {
  readonly index: number
  readonly ratio: number
  readonly width: number
}

export interface ViewModelRow {
  readonly index: number
  readonly height: number
  readonly role: TableRowRole
  /** 兼容字段；自虚拟行废弃后永远为 false */
  readonly virtual: boolean
  readonly layoutY: number
}

export interface ViewModelRect {
  x: number
  y: number
  w: number
  h: number
}

export interface ViewModelHit {
  type: 'cell'
  /** 合并解析后的 owner cell [row, col] */
  path: readonly [row: number, col: number]
  /** 命中前的原始 grid cell（未解析 merge owner） */
  rawRow: number
  rawCol: number
  /** 兼容字段；自虚拟行废弃后永远为 false */
  virtual: boolean
}

export interface ViewModel {
  readonly rows: readonly ViewModelRow[]
  readonly columns: readonly ViewModelColumn[]
  hitTest: (local: { x: number, y: number }) => ViewModelHit | null
  rectOf: (path: readonly unknown[]) => ViewModelRect | null
  readonly extras: Readonly<Record<string, unknown>>
}

function buildViewModel(
  topology: TableTopologySchema,
  elementWidth: number,
  elementHeight: number,
): ViewModel {
  const { columns, rows } = topology
  const colWidths = computeColumnWidths(columns, elementWidth)
  const rowHeights = computeRowHeights(rows, elementHeight)

  const cols: ViewModelColumn[] = columns.map((c, i) => ({
    index: i,
    ratio: c.ratio,
    width: colWidths[i] ?? 0,
  }))

  const layoutY: number[] = []
  {
    let y = 0
    for (let i = 0; i < rows.length; i++) {
      layoutY.push(y)
      y += rowHeights[i] ?? 0
    }
  }

  const rs: ViewModelRow[] = rows.map((r, i) => ({
    index: i,
    height: rowHeights[i] ?? r.height,
    role: r.role,
    virtual: false,
    layoutY: layoutY[i] ?? 0,
  }))

  const hitTest = (local: { x: number, y: number }): ViewModelHit | null => {
    const raw = hitTestGridCell(topology, elementWidth, elementHeight, local.x, local.y)
    if (!raw)
      return null
    const owner = resolveMergeOwner(topology, raw.row, raw.col)
    return {
      type: 'cell',
      path: [owner.row, owner.col] as const,
      rawRow: raw.row,
      rawCol: raw.col,
      virtual: false,
    }
  }

  const rectOf = (path: readonly unknown[]): ViewModelRect | null => {
    const r = path[0]
    const c = path[1]
    if (typeof r !== 'number' || typeof c !== 'number')
      return null
    const rect = computeCellRect(topology, elementWidth, elementHeight, r, c)
    if (!rect)
      return null
    return rect
  }

  return {
    rows: rs,
    columns: cols,
    hitTest,
    rectOf,
    extras: {},
  }
}

export function buildTableStaticViewModel(node: TableNode): ViewModel {
  return buildViewModel(node.table.topology, node.width, node.height)
}

/**
 * 构建 table-data 的 ViewModel。
 * 与 static 等价；repeat-template 的 N 行展开发生在 viewer runtime。
 */
export function buildTableDataViewModel(node: TableNode): ViewModel {
  return buildViewModel(node.table.topology, node.width, node.height)
}

/**
 * 缓存工厂：按 (doc, nodeId) 身份做 key。doc 替换（新快照）后自动失效。
 */
export function memoViewModel<T>(
  compute: (doc: DocumentSchema, nodeId: string) => T,
): (doc: DocumentSchema, nodeId: string) => T {
  const cache = new WeakMap<DocumentSchema, Map<string, T>>()
  return (doc, nodeId) => {
    let inner = cache.get(doc)
    if (!inner) {
      inner = new Map()
      cache.set(doc, inner)
    }
    let v = inner.get(nodeId)
    if (v === undefined) {
      v = compute(doc, nodeId)
      inner.set(nodeId, v)
    }
    return v
  }
}
