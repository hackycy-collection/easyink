/**
 * Table kernel steps: atomic mutations on table topology.
 *
 * 每个 step 对应表格的一种结构或内容变更，满足 core 的 Step 接口：
 * - apply(doc) => { doc }  ：不可变地返回新 doc
 * - invert(doc) => Step    ：返回反向 step
 * - getMap() => StepMap    ：选区映射（默认用 identity，行列变更时用专用 map）
 * - toJSON()               ：JSON 序列化
 *
 * 约定：所有 step 操作的是 `node.table.topology`，node 必须是 TableNode。
 */

import type {
  Selection,
  Step,
  StepJSON,
  StepMap,
  StepResult,
} from '@easyink/core'
import type {
  DocumentSchema,
  TableCellSchema,
  TableColumnSchema,
  TableNode,
  TableRowSchema,
  TableTopologySchema,
} from '@easyink/schema'
import {
  emptySelection,
  identityStepMap,
  patchNode,
  setByPathImmutable,
  snapshotJson,
} from '@easyink/core'

// ─── helpers ──────────────────────────────────────────────────────

function getTableNode(doc: DocumentSchema, nodeId: string): TableNode | undefined {
  const node = doc.elements.find(el => el.id === nodeId) as TableNode | undefined
  if (!node || !('table' in node) || !node.table)
    return undefined
  return node
}

function replaceTopology(
  doc: DocumentSchema,
  nodeId: string,
  topology: TableTopologySchema,
): DocumentSchema {
  const next = patchNode(doc, nodeId, (n) => {
    const tn = n as TableNode
    return { ...tn, table: { ...tn.table, topology } } as unknown as typeof n
  })
  return next ?? doc
}

function emptyCell(): TableCellSchema {
  return {}
}

function defaultRow(cols: number, height: number, role: TableRowSchema['role'] = 'normal'): TableRowSchema {
  return {
    height,
    role,
    cells: Array.from({ length: cols }, emptyCell),
  }
}

/**
 * 当表格结构变化（增删行/列）时，如果选区是 table-cell 选区，需要同步调整 row/col 索引。
 * 简化策略：删除目标行/列上的 selection 降级为 element 选区（选中整个表格）。
 */
function rowStructureStepMap(nodeId: string, changedRowIndex: number, delta: number): StepMap {
  return {
    mapSelection(sel: Selection): Selection | null {
      if (sel.type !== 'table-cell' || sel.nodeId !== nodeId)
        return sel
      const path = sel.path as readonly [number, number] | null
      if (!path)
        return sel
      const [r, c] = path
      if (delta > 0) {
        // insert: row >= changedRowIndex → shift down
        if (r >= changedRowIndex)
          return buildCellSelection(sel, r + delta, c)
        return sel
      }
      // remove: row === changedRowIndex → drop; row > changedRowIndex → shift up
      if (r === changedRowIndex)
        return null
      if (r > changedRowIndex)
        return buildCellSelection(sel, r + delta, c)
      return sel
    },
  }
}

function colStructureStepMap(nodeId: string, changedColIndex: number, delta: number): StepMap {
  return {
    mapSelection(sel: Selection): Selection | null {
      if (sel.type !== 'table-cell' || sel.nodeId !== nodeId)
        return sel
      const path = sel.path as readonly [number, number] | null
      if (!path)
        return sel
      const [r, c] = path
      if (delta > 0) {
        if (c >= changedColIndex)
          return buildCellSelection(sel, r, c + delta)
        return sel
      }
      if (c === changedColIndex)
        return null
      if (c > changedColIndex)
        return buildCellSelection(sel, r, c + delta)
      return sel
    },
  }
}

function buildCellSelection(proto: Selection, row: number, col: number): Selection {
  // 保留 selection 的 type/nodeId，只改 path
  const next = {
    ...(proto as unknown as Record<string, unknown>),
    type: proto.type,
    nodeId: proto.nodeId,
    path: [row, col] as const,
    toJSON: () => ({
      type: proto.type,
      nodeId: proto.nodeId,
      path: [row, col] as const,
    }),
  }
  return next as unknown as Selection
}

// 防止 emptySelection 被 tree-shake 后变成未使用导入
void emptySelection

// ─── InsertRowStep ────────────────────────────────────────────────

export interface InsertRowStepJSON extends StepJSON {
  stepType: 'table/insert-row'
  nodeId: string
  rowIndex: number
  row?: TableRowSchema
}

export class InsertRowStep implements Step {
  readonly stepType = 'table/insert-row'
  constructor(
    readonly nodeId: string,
    readonly rowIndex: number,
    readonly row?: TableRowSchema,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    const idx = Math.max(0, Math.min(this.rowIndex, topo.rows.length))
    const cols = topo.columns.length
    const fallbackHeight = topo.rows[Math.min(idx, topo.rows.length - 1)]?.height ?? 8
    const inserted = this.row ?? defaultRow(cols, fallbackHeight)
    const nextRows = [...topo.rows.slice(0, idx), inserted, ...topo.rows.slice(idx)]
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(): Step {
    return new RemoveRowStep(this.nodeId, this.rowIndex)
  }

  getMap(): StepMap {
    return rowStructureStepMap(this.nodeId, this.rowIndex, +1)
  }

  toJSON(): InsertRowStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      rowIndex: this.rowIndex,
      row: this.row ? snapshotJson(this.row) : undefined,
    }
  }
}

// ─── RemoveRowStep ────────────────────────────────────────────────

export interface RemoveRowStepJSON extends StepJSON {
  stepType: 'table/remove-row'
  nodeId: string
  rowIndex: number
  /** invert 时回填 */
  removedRow?: TableRowSchema
}

export class RemoveRowStep implements Step {
  readonly stepType = 'table/remove-row'
  constructor(
    readonly nodeId: string,
    readonly rowIndex: number,
    readonly removedRow?: TableRowSchema,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    if (this.rowIndex < 0 || this.rowIndex >= topo.rows.length)
      return { failed: `row index out of range: ${this.rowIndex}` }
    const nextRows = [...topo.rows.slice(0, this.rowIndex), ...topo.rows.slice(this.rowIndex + 1)]
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    const row = node?.table.topology.rows[this.rowIndex]
    return new InsertRowStep(this.nodeId, this.rowIndex, row ? snapshotJson(row) : undefined)
  }

  getMap(): StepMap {
    return rowStructureStepMap(this.nodeId, this.rowIndex, -1)
  }

  toJSON(): RemoveRowStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      rowIndex: this.rowIndex,
    }
  }
}

// ─── InsertColStep ────────────────────────────────────────────────

export interface InsertColStepJSON extends StepJSON {
  stepType: 'table/insert-col'
  nodeId: string
  colIndex: number
  column?: TableColumnSchema
}

export class InsertColStep implements Step {
  readonly stepType = 'table/insert-col'
  constructor(
    readonly nodeId: string,
    readonly colIndex: number,
    readonly column?: TableColumnSchema,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    const idx = Math.max(0, Math.min(this.colIndex, topo.columns.length))
    const totalCols = topo.columns.length + 1
    // 平均重算 ratio：插入后所有列等权（v1 策略，后续可调）
    const newRatio = 1 / totalCols
    const inserted: TableColumnSchema = this.column ?? { ratio: newRatio }
    const rescaled = topo.columns.map(col => ({ ...col, ratio: col.ratio * (1 - inserted.ratio) }))
    const nextCols = [...rescaled.slice(0, idx), inserted, ...rescaled.slice(idx)]
    const nextRows = topo.rows.map(r => ({
      ...r,
      cells: [...r.cells.slice(0, idx), emptyCell(), ...r.cells.slice(idx)],
    }))
    return { doc: replaceTopology(doc, this.nodeId, { columns: nextCols, rows: nextRows }) }
  }

  invert(): Step {
    return new RemoveColStep(this.nodeId, this.colIndex)
  }

  getMap(): StepMap {
    return colStructureStepMap(this.nodeId, this.colIndex, +1)
  }

  toJSON(): InsertColStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      colIndex: this.colIndex,
      column: this.column ? snapshotJson(this.column) : undefined,
    }
  }
}

// ─── RemoveColStep ────────────────────────────────────────────────

export interface RemoveColStepJSON extends StepJSON {
  stepType: 'table/remove-col'
  nodeId: string
  colIndex: number
}

export class RemoveColStep implements Step {
  readonly stepType = 'table/remove-col'
  constructor(
    readonly nodeId: string,
    readonly colIndex: number,
    /** invert 时记录整列，用于准确还原 */
    readonly removedColumn?: TableColumnSchema,
    readonly removedCells?: TableCellSchema[],
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    if (this.colIndex < 0 || this.colIndex >= topo.columns.length)
      return { failed: `col index out of range: ${this.colIndex}` }
    const removed = topo.columns[this.colIndex]!
    const remaining = [...topo.columns.slice(0, this.colIndex), ...topo.columns.slice(this.colIndex + 1)]
    const factor = 1 / (1 - removed.ratio || 1e-9)
    const nextCols = remaining.map(col => ({ ...col, ratio: col.ratio * factor }))
    const nextRows = topo.rows.map(r => ({
      ...r,
      cells: [...r.cells.slice(0, this.colIndex), ...r.cells.slice(this.colIndex + 1)],
    }))
    return { doc: replaceTopology(doc, this.nodeId, { columns: nextCols, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return new InsertColStep(this.nodeId, this.colIndex)
    const col = node.table.topology.columns[this.colIndex]
    // v1：simplfied — 只还原列，cells 内容还原通过 tx 层额外补偿
    return new InsertColStep(
      this.nodeId,
      this.colIndex,
      col ? snapshotJson(col) : undefined,
    )
  }

  getMap(): StepMap {
    return colStructureStepMap(this.nodeId, this.colIndex, -1)
  }

  toJSON(): RemoveColStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      colIndex: this.colIndex,
    }
  }
}

// ─── ResizeColumnStep ─────────────────────────────────────────────

export interface ResizeColumnStepJSON extends StepJSON {
  stepType: 'table/resize-col'
  nodeId: string
  colIndex: number
  newRatio: number
}

export class ResizeColumnStep implements Step {
  readonly stepType = 'table/resize-col'
  constructor(
    readonly nodeId: string,
    readonly colIndex: number,
    readonly newRatio: number,
    readonly prevRatio?: number,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    if (this.colIndex < 0 || this.colIndex >= topo.columns.length)
      return { failed: `col index out of range: ${this.colIndex}` }
    const prev = topo.columns[this.colIndex]!.ratio
    const delta = this.newRatio - prev
    // 从相邻右侧列借/补 delta；若没有右侧列则从左侧
    const neighborIdx = this.colIndex + 1 < topo.columns.length ? this.colIndex + 1 : this.colIndex - 1
    if (neighborIdx < 0) {
      // 只有一列：不能调整
      return { doc }
    }
    const nextCols = topo.columns.map((col, i) => {
      if (i === this.colIndex)
        return { ...col, ratio: this.newRatio }
      if (i === neighborIdx)
        return { ...col, ratio: Math.max(0.01, col.ratio - delta) }
      return col
    })
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, columns: nextCols }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    const prev = this.prevRatio ?? node?.table.topology.columns[this.colIndex]?.ratio ?? this.newRatio
    return new ResizeColumnStep(this.nodeId, this.colIndex, prev, this.newRatio)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): ResizeColumnStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      colIndex: this.colIndex,
      newRatio: this.newRatio,
    }
  }
}

// ─── ResizeRowStep ────────────────────────────────────────────────

export interface ResizeRowStepJSON extends StepJSON {
  stepType: 'table/resize-row'
  nodeId: string
  rowIndex: number
  newHeight: number
}

export class ResizeRowStep implements Step {
  readonly stepType = 'table/resize-row'
  constructor(
    readonly nodeId: string,
    readonly rowIndex: number,
    readonly newHeight: number,
    readonly prevHeight?: number,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    if (this.rowIndex < 0 || this.rowIndex >= topo.rows.length)
      return { failed: `row index out of range: ${this.rowIndex}` }
    const nextRows = topo.rows.map((r, i) =>
      i === this.rowIndex ? { ...r, height: this.newHeight } : r,
    )
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    const prev = this.prevHeight ?? node?.table.topology.rows[this.rowIndex]?.height ?? this.newHeight
    return new ResizeRowStep(this.nodeId, this.rowIndex, prev, this.newHeight)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): ResizeRowStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      rowIndex: this.rowIndex,
      newHeight: this.newHeight,
    }
  }
}

// ─── UpdateCellStep ───────────────────────────────────────────────

export interface UpdateCellStepJSON extends StepJSON {
  stepType: 'table/update-cell'
  nodeId: string
  row: number
  col: number
  /** cell 内部点分路径，如 'content.text' / 'typography.color' */
  path: string
  value: unknown
}

export class UpdateCellStep implements Step {
  readonly stepType = 'table/update-cell'
  constructor(
    readonly nodeId: string,
    readonly row: number,
    readonly col: number,
    readonly path: string,
    readonly value: unknown,
    readonly prevValue?: unknown,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    const rowSchema = topo.rows[this.row]
    const cell = rowSchema?.cells[this.col]
    if (!rowSchema || !cell)
      return { failed: `cell not found: ${this.row},${this.col}` }
    const nextCell = setByPathImmutable(cell, this.path, this.value)
    const nextCells = [...rowSchema.cells]
    nextCells[this.col] = nextCell
    const nextRows = [...topo.rows]
    nextRows[this.row] = { ...rowSchema, cells: nextCells }
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    if (this.prevValue !== undefined) {
      return new UpdateCellStep(this.nodeId, this.row, this.col, this.path, this.prevValue, this.value)
    }
    const node = getTableNode(doc, this.nodeId)
    const cell = node?.table.topology.rows[this.row]?.cells[this.col]
    const prev = cell ? readCellPath(cell, this.path) : undefined
    return new UpdateCellStep(this.nodeId, this.row, this.col, this.path, prev, this.value)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): UpdateCellStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      row: this.row,
      col: this.col,
      path: this.path,
      value: this.value as unknown,
    }
  }
}

function readCellPath(cell: TableCellSchema, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = cell
  for (const part of parts) {
    if (current == null || typeof current !== 'object')
      return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ─── MergeCellsStep ───────────────────────────────────────────────

export interface MergeCellsStepJSON extends StepJSON {
  stepType: 'table/merge-cells'
  nodeId: string
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

export class MergeCellsStep implements Step {
  readonly stepType = 'table/merge-cells'
  constructor(
    readonly nodeId: string,
    readonly row: number,
    readonly col: number,
    readonly rowSpan: number,
    readonly colSpan: number,
    /** invert 时需要还原被清空的内部 cells */
    readonly prevCells?: Array<{ r: number, c: number, cell: TableCellSchema }>,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    if (this.rowSpan < 1 || this.colSpan < 1)
      return { failed: 'span must be >= 1' }
    const rowSchema = topo.rows[this.row]
    const cell = rowSchema?.cells[this.col]
    if (!rowSchema || !cell)
      return { failed: `cell not found: ${this.row},${this.col}` }
    const nextRows = topo.rows.map((r, ri) => {
      const nextCells = r.cells.map((c, ci) => {
        if (ri === this.row && ci === this.col)
          return { ...c, rowSpan: this.rowSpan, colSpan: this.colSpan }
        // 被覆盖的内部单元格置空（保持占位，便于 invert；真正的"不渲染"由 topology.resolveMergeOwner 决定）
        if (ri >= this.row && ri < this.row + this.rowSpan
          && ci >= this.col && ci < this.col + this.colSpan
          && !(ri === this.row && ci === this.col)) {
          return {}
        }
        return c
      })
      return { ...r, cells: nextCells }
    })
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    const prev: Array<{ r: number, c: number, cell: TableCellSchema }> = []
    if (node) {
      const topo = node.table.topology
      for (let r = this.row; r < Math.min(this.row + this.rowSpan, topo.rows.length); r++) {
        for (let c = this.col; c < Math.min(this.col + this.colSpan, topo.columns.length); c++) {
          if (r === this.row && c === this.col)
            continue
          const cell = topo.rows[r]?.cells[c]
          if (cell)
            prev.push({ r, c, cell: snapshotJson(cell) })
        }
      }
    }
    return new SplitCellStep(this.nodeId, this.row, this.col, prev)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): MergeCellsStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      row: this.row,
      col: this.col,
      rowSpan: this.rowSpan,
      colSpan: this.colSpan,
    }
  }
}

// ─── SplitCellStep ────────────────────────────────────────────────

export interface SplitCellStepJSON extends StepJSON {
  stepType: 'table/split-cell'
  nodeId: string
  row: number
  col: number
}

export class SplitCellStep implements Step {
  readonly stepType = 'table/split-cell'
  constructor(
    readonly nodeId: string,
    readonly row: number,
    readonly col: number,
    /** merge 时保存的内部 cells，用于还原 */
    readonly restoreCells?: Array<{ r: number, c: number, cell: TableCellSchema }>,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = getTableNode(doc, this.nodeId)
    if (!node)
      return { failed: `table node not found: ${this.nodeId}` }
    const topo = node.table.topology
    const rowSchema = topo.rows[this.row]
    const cell = rowSchema?.cells[this.col]
    if (!rowSchema || !cell)
      return { failed: `cell not found: ${this.row},${this.col}` }
    const rs = cell.rowSpan ?? 1
    const cs = cell.colSpan ?? 1
    const nextRows = topo.rows.map((r, ri) => {
      const nextCells = r.cells.map((c, ci) => {
        if (ri === this.row && ci === this.col) {
          const { rowSpan, colSpan, ...rest } = c
          void rowSpan
          void colSpan
          return rest
        }
        // 还原区域内的 cell
        if (this.restoreCells && ri >= this.row && ri < this.row + rs && ci >= this.col && ci < this.col + cs) {
          const saved = this.restoreCells.find(s => s.r === ri && s.c === ci)
          if (saved)
            return saved.cell
        }
        return c
      })
      return { ...r, cells: nextCells }
    })
    return { doc: replaceTopology(doc, this.nodeId, { ...topo, rows: nextRows }) }
  }

  invert(doc: DocumentSchema): Step {
    const node = getTableNode(doc, this.nodeId)
    const cell = node?.table.topology.rows[this.row]?.cells[this.col]
    const rs = cell?.rowSpan ?? 1
    const cs = cell?.colSpan ?? 1
    return new MergeCellsStep(this.nodeId, this.row, this.col, rs, cs)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): SplitCellStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      row: this.row,
      col: this.col,
    }
  }
}

// ─── SetCellBindingStep ───────────────────────────────────────────

export interface SetCellBindingStepJSON extends StepJSON {
  stepType: 'table/set-cell-binding'
  nodeId: string
  row: number
  col: number
  /** 'binding' 对应 table-data 的相对路径绑定；'staticBinding' 对应 table-static 的独立绑定 */
  field: 'binding' | 'staticBinding'
  value: unknown
}

export class SetCellBindingStep implements Step {
  readonly stepType = 'table/set-cell-binding'
  constructor(
    readonly nodeId: string,
    readonly row: number,
    readonly col: number,
    readonly field: 'binding' | 'staticBinding',
    readonly value: unknown,
    readonly prevValue?: unknown,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    return new UpdateCellStep(this.nodeId, this.row, this.col, this.field, this.value).apply(doc)
  }

  invert(doc: DocumentSchema): Step {
    if (this.prevValue !== undefined) {
      return new SetCellBindingStep(this.nodeId, this.row, this.col, this.field, this.prevValue, this.value)
    }
    const node = getTableNode(doc, this.nodeId)
    const cell = node?.table.topology.rows[this.row]?.cells[this.col]
    const prev = cell ? (cell as Record<string, unknown>)[this.field] : undefined
    return new SetCellBindingStep(this.nodeId, this.row, this.col, this.field, prev, this.value)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): SetCellBindingStepJSON {
    return {
      stepType: this.stepType,
      nodeId: this.nodeId,
      row: this.row,
      col: this.col,
      field: this.field,
      value: this.value as unknown,
    }
  }
}

// ─── Registry helpers ─────────────────────────────────────────────

/**
 * 所有 table kernel step 的 StepSpec 列表，供 extension 注册到 plugin.stepTypes。
 */
export const TABLE_STEP_SPECS = [
  {
    stepType: 'table/insert-row',
    fromJSON: (json: StepJSON) => {
      const j = json as InsertRowStepJSON
      return new InsertRowStep(j.nodeId, j.rowIndex, j.row)
    },
  },
  {
    stepType: 'table/remove-row',
    fromJSON: (json: StepJSON) => {
      const j = json as RemoveRowStepJSON
      return new RemoveRowStep(j.nodeId, j.rowIndex, j.removedRow)
    },
  },
  {
    stepType: 'table/insert-col',
    fromJSON: (json: StepJSON) => {
      const j = json as InsertColStepJSON
      return new InsertColStep(j.nodeId, j.colIndex, j.column)
    },
  },
  {
    stepType: 'table/remove-col',
    fromJSON: (json: StepJSON) => {
      const j = json as RemoveColStepJSON
      return new RemoveColStep(j.nodeId, j.colIndex)
    },
  },
  {
    stepType: 'table/resize-col',
    fromJSON: (json: StepJSON) => {
      const j = json as ResizeColumnStepJSON
      return new ResizeColumnStep(j.nodeId, j.colIndex, j.newRatio)
    },
  },
  {
    stepType: 'table/resize-row',
    fromJSON: (json: StepJSON) => {
      const j = json as ResizeRowStepJSON
      return new ResizeRowStep(j.nodeId, j.rowIndex, j.newHeight)
    },
  },
  {
    stepType: 'table/update-cell',
    fromJSON: (json: StepJSON) => {
      const j = json as UpdateCellStepJSON
      return new UpdateCellStep(j.nodeId, j.row, j.col, j.path, j.value)
    },
  },
  {
    stepType: 'table/merge-cells',
    fromJSON: (json: StepJSON) => {
      const j = json as MergeCellsStepJSON
      return new MergeCellsStep(j.nodeId, j.row, j.col, j.rowSpan, j.colSpan)
    },
  },
  {
    stepType: 'table/split-cell',
    fromJSON: (json: StepJSON) => {
      const j = json as SplitCellStepJSON
      return new SplitCellStep(j.nodeId, j.row, j.col)
    },
  },
  {
    stepType: 'table/set-cell-binding',
    fromJSON: (json: StepJSON) => {
      const j = json as SetCellBindingStepJSON
      return new SetCellBindingStep(j.nodeId, j.row, j.col, j.field, j.value)
    },
  },
] as const
