/**
 * 表格物料浮动工具栏贡献工厂。
 *
 * 见 `.github/architecture/23-table-interaction.md` §23.5。
 *
 * - `createTableToolbarContribution(opts)` 返回 `ToolbarContribution`
 * - static / data 仅在 `allowMergeSplit` 与 row 角色限制上不同
 */

import type { EditorState, ToolbarContribution, ToolbarItem, Transaction } from '@easyink/core'
import type { TableNode, TableRowSchema } from '@easyink/schema'
import { isTableNode } from '@easyink/schema'
import {
  InsertColStep,
  InsertRowStep,
  RemoveColStep,
  RemoveRowStep,
  SplitCellStep,
} from './steps'
import { resolveMergeOwner } from './topology'

export interface TableToolbarOptions {
  ownerKey: string
  /** 仅 `static` 提供合并/拆分按钮；`data` 完全禁用 */
  allowMergeSplit: boolean
  /**
   * 行角色保护：是否允许在该角色行的上下方插入 / 删除该行。
   * 默认全部允许（static）；data 一般禁止删除/在 header 上方插入等。
   */
  protectRoles?: {
    /** 不能删除 */
    nonDeletable?: ReadonlyArray<TableRowSchema['role']>
    /** 不能在该行上方插入新行 */
    insertAboveBlocked?: ReadonlyArray<TableRowSchema['role']>
    /** 不能在该行下方插入新行 */
    insertBelowBlocked?: ReadonlyArray<TableRowSchema['role']>
  }
}

interface SelectionInfo {
  node: TableNode
  row: number
  col: number
  rowSchema: TableRowSchema
}

function getSelectedCell(state: EditorState): SelectionInfo | null {
  const sel = state.selection
  if (sel.type !== 'table-cell' || !sel.nodeId)
    return null
  const path = sel.path
  if (!Array.isArray(path) || typeof path[0] !== 'number' || typeof path[1] !== 'number')
    return null
  const node = state.doc.elements.find(e => e.id === sel.nodeId)
  if (!node || !isTableNode(node))
    return null
  const owner = resolveMergeOwner(node.table.topology, path[0], path[1])
  const rowSchema = node.table.topology.rows[owner.row]
  if (!rowSchema)
    return null
  return { node: node as TableNode, row: owner.row, col: owner.col, rowSchema }
}

function dispatchStep(state: EditorState, dispatch: (tr: Transaction) => void, step: import('@easyink/core').Step): void {
  dispatch(state.tr.step(step))
}

export function createTableToolbarContribution(opts: TableToolbarOptions): ToolbarContribution {
  const protect = opts.protectRoles ?? {}
  const nonDeletable = new Set(protect.nonDeletable ?? [])
  const insertAboveBlocked = new Set(protect.insertAboveBlocked ?? [])
  const insertBelowBlocked = new Set(protect.insertBelowBlocked ?? [])

  return {
    ownerKey: opts.ownerKey,
    visible: state => getSelectedCell(state) !== null,
    anchorNodeId: state => getSelectedCell(state)?.node.id ?? null,
    items: (state) => {
      const info = getSelectedCell(state)
      if (!info)
        return []
      const { node, row, col, rowSchema } = info
      const rowsLen = node.table.topology.rows.length
      const colsLen = node.table.topology.columns.length
      const cell = rowSchema.cells[col]

      const items: ToolbarItem[] = [
        {
          id: 'insert-row-above',
          label: '在上方插入行',
          enabled: () => !insertAboveBlocked.has(rowSchema.role),
          run(s, d) {
            dispatchStep(s, d, new InsertRowStep(node.id, row))
          },
        },
        {
          id: 'insert-row-below',
          label: '在下方插入行',
          enabled: () => !insertBelowBlocked.has(rowSchema.role),
          run(s, d) {
            dispatchStep(s, d, new InsertRowStep(node.id, row + 1))
          },
        },
        {
          id: 'insert-col-left',
          label: '在左侧插入列',
          run(s, d) {
            dispatchStep(s, d, new InsertColStep(node.id, col))
          },
        },
        {
          id: 'insert-col-right',
          label: '在右侧插入列',
          run(s, d) {
            dispatchStep(s, d, new InsertColStep(node.id, col + 1))
          },
        },
        {
          id: 'remove-row',
          label: '删除行',
          enabled: () => rowsLen > 1 && !nonDeletable.has(rowSchema.role),
          run(s, d) {
            dispatchStep(s, d, new RemoveRowStep(node.id, row))
          },
        },
        {
          id: 'remove-col',
          label: '删除列',
          enabled: () => colsLen > 1,
          run(s, d) {
            dispatchStep(s, d, new RemoveColStep(node.id, col))
          },
        },
      ]

      if (opts.allowMergeSplit) {
        // 合并按钮：本期无 cell-range 选区，永远禁用但保留位置
        items.push({
          id: 'merge-cells',
          label: '合并单元格',
          enabled: () => false,
          run() { /* 待 cell-range 选区落地后启用 */ },
        })
        const isMerged = !!cell && ((cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1)
        items.push({
          id: 'split-cell',
          label: '拆分单元格',
          enabled: () => isMerged,
          run(s, d) {
            dispatchStep(s, d, new SplitCellStep(node.id, row, col))
          },
        })
      }

      return items
    },
  }
}
