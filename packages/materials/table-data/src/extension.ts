/**
 * table-static 的新式 plugin 式 Material Extension。
 * 与旧的 `designer.ts` 并存；Designer 完成 EditorView 切换后会取代旧实现。
 */

import type {
  AnyPlugin,
  EditorState,
  MaterialExtension,
  PanelContribution,
  PluginView,
  PropertyPanelContext,
  Transaction,
  ViewContext,
} from '@easyink/core'
import type { BindingRef, MaterialNode, TableNode } from '@easyink/schema'
import { defineMaterial } from '@easyink/core'
import { Fragment, h } from '@easyink/core/view'
import {
  buildTableDataViewModel,
  CELL_PROP_SCHEMAS,
  createTableToolbarContribution,
  escapeHtml,
  memoViewModel,
  renderTableHtml,
  tableCellSelection,
  tableCellSelectionSpec,
} from '@easyink/material-table-kernel'
import {
  InsertColStep,
  InsertRowStep,
  // 按 23-table-interaction.md §6：data 表格完全禁止合并。
  RemoveColStep,
  RemoveRowStep,
  ResizeColumnStep,
  ResizeRowStep,
  SetCellBindingStep,
  TABLE_STEP_SPECS,
  UpdateCellStep,
} from '@easyink/material-table-kernel/steps'
import { isTableNode } from '@easyink/schema'
import {
  createTableDataNode,
  TABLE_DATA_CAPABILITIES,
  TABLE_DATA_DEFAULTS,
  TABLE_DATA_TYPE,
} from './schema'

// ─── ViewModel 缓存 ─────────────────────────────────────────────────

const getVM = memoViewModel((doc, nodeId) => {
  const node = doc.elements.find(e => e.id === nodeId)
  return node && isTableNode(node) ? buildTableDataViewModel(node as TableNode) : null
})

function findTable(state: EditorState, nodeId: string): TableNode | null {
  const n = state.doc.elements.find(e => e.id === nodeId)
  return n && isTableNode(n) ? (n as TableNode) : null
}

// ─── Commands ─────────────────────────────────────────────────────

export const tableDataCommands = {
  insertRowBelow(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [row] = sel.path as readonly [number, number]
    return state.tr.step(new InsertRowStep(sel.nodeId, row + 1))
  },
  insertRowAbove(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [row] = sel.path as readonly [number, number]
    return state.tr.step(new InsertRowStep(sel.nodeId, row))
  },
  removeRow(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [row] = sel.path as readonly [number, number]
    return state.tr.step(new RemoveRowStep(sel.nodeId, row))
  },
  insertColRight(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [, col] = sel.path as readonly [number, number]
    return state.tr.step(new InsertColStep(sel.nodeId, col + 1))
  },
  insertColLeft(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [, col] = sel.path as readonly [number, number]
    return state.tr.step(new InsertColStep(sel.nodeId, col))
  },
  removeCol(state: EditorState): Transaction | null {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const [, col] = sel.path as readonly [number, number]
    return state.tr.step(new RemoveColStep(sel.nodeId, col))
  },
  resizeColumn(
    state: EditorState,
    args: { nodeId: string, colIndex: number, newRatio: number },
  ): Transaction | null {
    return state.tr
      .step(new ResizeColumnStep(args.nodeId, args.colIndex, args.newRatio))
      .setMeta('historyGroup', `resize-col:${args.nodeId}:${args.colIndex}`)
  },
  resizeRow(
    state: EditorState,
    args: { nodeId: string, rowIndex: number, newHeight: number },
  ): Transaction | null {
    return state.tr
      .step(new ResizeRowStep(args.nodeId, args.rowIndex, args.newHeight))
      .setMeta('historyGroup', `resize-row:${args.nodeId}:${args.rowIndex}`)
  },
  updateCellProp(
    state: EditorState,
    args: { nodeId: string, row: number, col: number, key: string, value: unknown },
  ): Transaction | null {
    const field = args.key === 'padding' || args.key === 'border'
      ? args.key
      : `typography.${args.key}`
    const value = args.key === 'padding' && typeof args.value === 'number'
      ? { top: args.value, right: args.value, bottom: args.value, left: args.value }
      : args.value
    return state.tr.step(new UpdateCellStep(args.nodeId, args.row, args.col, field, value))
  },
  bindCell(
    state: EditorState,
    args: { nodeId: string, row: number, col: number, binding: BindingRef },
  ): Transaction | null {
    return state.tr.step(new SetCellBindingStep(args.nodeId, args.row, args.col, 'binding', args.binding))
  },
  clearCellBinding(
    state: EditorState,
    args: { nodeId: string, row: number, col: number },
  ): Transaction | null {
    return state.tr.step(new SetCellBindingStep(args.nodeId, args.row, args.col, 'binding', undefined))
  },
}

// ─── View ─────────────────────────────────────────────────────────

function cellHtml(node: TableNode, unit: string, resolveBinding?: (ref: BindingRef) => string): string {
  return renderTableHtml({
    topology: node.table.topology,
    props: node.props as any,
    unit,
    elementHeight: node.height,
    tableStyle: 'height:100%',
    cellRenderer: (cell) => {
      if (cell.binding && resolveBinding)
        return `<span>{#${escapeHtml(resolveBinding(cell.binding))}}</span>`
      return cell.content?.text || ''
    },
  })
}

const viewPlugin: PluginView = {
  render(ctx: ViewContext) {
    const { state, utils } = ctx
    const sel = state.selection
    for (const node of state.doc.elements) {
      if (node.type !== TABLE_DATA_TYPE)
        continue
      const html = cellHtml(node as TableNode, utils.unit, utils.getBindingLabel as any)
      ctx.layers.content.push(
        h('div', {
          'class': 'easyink-table-data-node',
          'data-node-id': node.id,
          'style': `position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;overflow:hidden`,
          'dangerouslySetInnerHTML': { __html: html },
        }),
      )
      if (sel.type === 'table-cell' && sel.nodeId === node.id) {
        const vm = getVM(state.doc, node.id)
        const rect = vm?.rectOf(sel.path as any)
        if (rect) {
          ctx.layers.overlay.push(
            h('div', {
              class: 'easyink-table-cell-highlight',
              style: `position:absolute;pointer-events:none;border:2px solid #1677ff;left:${node.x + rect.x}px;top:${node.y + rect.y}px;width:${rect.w}px;height:${rect.h}px`,
            }),
          )
        }
      }
    }
    return null
  },
}

// ─── PropertyPanel ────────────────────────────────────────────────

function propertyPanel(ctx: PropertyPanelContext): PanelContribution[] {
  const { state, dispatch, t } = ctx
  const sel = state.selection
  if (sel.type !== 'table-cell' || !sel.nodeId)
    return []
  const node = findTable(state, sel.nodeId)
  if (!node)
    return []
  const [row, col] = sel.path as readonly [number, number]
  const cell = node.table.topology.rows[row]?.cells[col]
  if (!cell)
    return []
  return [
    {
      id: 'table-cell',
      order: 70,
      title: t('designer.property.cellProperties'),
      schemas: [...CELL_PROP_SCHEMAS],
      readValue(key: string) {
        if (key === 'padding')
          return cell.padding?.top
        if (key === 'border')
          return cell.border
        return (cell.typography as Record<string, unknown> | undefined)?.[key]
      },
      writeValue(key: string, value: unknown) {
        const tr = tableDataCommands.updateCellProp(state, { nodeId: node.id, row, col, key, value })
        if (tr)
          dispatch(tr)
      },
      binding: cell.binding ?? null,
      clearBinding() {
        const tr = tableDataCommands.clearCellBinding(state, { nodeId: node.id, row, col })
        if (tr)
          dispatch(tr)
      },
    },
  ]
}

// ─── Keymap ───────────────────────────────────────────────────────

const keymap: Record<string, (state: EditorState, dispatch: (tr: Transaction) => void, e: KeyboardEvent) => boolean> = {
  'Mod-Enter': (state, dispatch) => {
    const tr = tableDataCommands.insertRowBelow(state)
    if (!tr)
      return false
    dispatch(tr)
    return true
  },
  'Escape': (state, dispatch) => {
    if (state.selection.type !== 'table-cell')
      return false
    // 降级到 element selection
    const nodeId = state.selection.nodeId!
    dispatch(state.tr.setSelection({
      type: 'element',
      nodeId,
      path: null,
      toJSON: () => ({ type: 'element', nodeId, path: null }),
    }))
    return true
  },
}

// ─── DropHandler ──────────────────────────────────────────────────

const dropHandler = {
  onDragOver(ctx: { state: EditorState, field: { fieldLabel?: string }, local: { x: number, y: number }, node: MaterialNode }) {
    if (!isTableNode(ctx.node))
      return null
    const vm = getVM(ctx.state.doc, ctx.node.id)
    if (!vm)
      return null
    const hit = vm.hitTest(ctx.local)
    if (!hit)
      return null
    const rect = vm.rectOf(hit.path)
    if (!rect)
      return null
    return { status: 'accepted', rect, label: ctx.field.fieldLabel }
  },
  onDrop(ctx: {
    state: EditorState
    dispatch: (tr: Transaction) => void
    field: BindingRef & { fieldLabel?: string }
    local: { x: number, y: number }
    node: MaterialNode
  }) {
    if (!isTableNode(ctx.node))
      return
    const vm = getVM(ctx.state.doc, ctx.node.id)
    if (!vm)
      return
    const hit = vm.hitTest(ctx.local)
    if (!hit)
      return
    const [row, col] = hit.path
    const tr = tableDataCommands.bindCell(ctx.state, {
      nodeId: ctx.node.id,
      row,
      col,
      binding: ctx.field,
    })
    if (tr)
      ctx.dispatch(tr.setSelection(tableCellSelection(ctx.node.id, row, col)))
  },
}

// ─── Deep panel slot ─────────────────────────────────────────────

/**
 * 选中绑定 cell（cell.binding 存在）时显示。
 * 见 `.github/architecture/23-table-interaction.md` §23.6。
 */
const tableDataDeepPanel: import('@easyink/core').DeepPanelContribution = {
  ownerKey: 'material-table-data',
  visible(state) {
    const sel = state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return false
    const node = state.doc.elements.find(e => e.id === sel.nodeId)
    if (!node || !isTableNode(node))
      return false
    const path = sel.path
    if (!Array.isArray(path) || typeof path[0] !== 'number' || typeof path[1] !== 'number')
      return false
    const cell = node.table.topology.rows[path[0]]?.cells[path[1]]
    return !!cell?.binding
  },
  view(ctx) {
    const sel = ctx.state.selection
    if (sel.type !== 'table-cell' || !sel.nodeId)
      return null
    const node = ctx.state.doc.elements.find(e => e.id === sel.nodeId)
    if (!node || !isTableNode(node))
      return null
    const path = sel.path
    if (!Array.isArray(path) || typeof path[0] !== 'number' || typeof path[1] !== 'number')
      return null
    const row = path[0] as number
    const col = path[1] as number
    const cell = node.table.topology.rows[row]?.cells[col]
    if (!cell?.binding)
      return null
    const label = cell.binding.fieldLabel || cell.binding.fieldKey || cell.binding.fieldPath
    return h(
      'div',
      { class: 'easyink-deep-panel easyink-deep-panel-table-cell' },
      h('div', { class: 'easyink-deep-panel-row' }, `${ctx.t('designer.dataSource.field') || 'Field'}: ${label}`),
      h(
        'button',
        {
          class: 'easyink-deep-panel-clear-binding',
          onClick: () => {
            const tr = tableDataCommands.clearCellBinding(ctx.state, { nodeId: node.id, row, col })
            if (tr)
              ctx.dispatch(tr)
          },
        },
        ctx.t('designer.dataSource.clearBinding') || 'Clear binding',
      ),
    )
  },
}

// ─── Plugin ───────────────────────────────────────────────────────

const tableDataPlugin: AnyPlugin = {
  key: 'material-table-data',
  selectionTypes: [tableCellSelectionSpec],
  stepTypes: TABLE_STEP_SPECS.filter(s => s.stepType !== 'table/merge-cells' && s.stepType !== 'table/split-cell'),
  view: viewPlugin,
  keymap,
  propertyPanel,
  dropHandler,
  commands: tableDataCommands as any,
  toolbar: createTableToolbarContribution({
    ownerKey: 'material-table-data',
    allowMergeSplit: false,
    protectRoles: {
      // header / footer / repeat-template 不允许删除，避免错位
      nonDeletable: ['header', 'footer', 'repeat-template'],
      insertAboveBlocked: ['header'],
      insertBelowBlocked: ['footer'],
    },
  }),
  deepPanel: tableDataDeepPanel,
}

// ─── MaterialExtension ────────────────────────────────────────────

export const tableDataMaterial: MaterialExtension = defineMaterial({
  type: TABLE_DATA_TYPE,
  category: 'data',
  createDefaultNode: createTableDataNode as any,
  plugins: [tableDataPlugin],
  capabilities: TABLE_DATA_CAPABILITIES,
})

// 保证 h/Fragment import 在 tree-shake 时保留（view 里用到 h；Fragment 为对齐架构文档留出扩展位）
void Fragment
void TABLE_DATA_DEFAULTS
