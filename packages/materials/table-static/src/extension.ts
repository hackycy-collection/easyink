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
import { h } from '@easyink/core/view'
import {
  buildTableStaticViewModel,
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
  MergeCellsStep,
  RemoveColStep,
  RemoveRowStep,
  ResizeColumnStep,
  ResizeRowStep,
  SetCellBindingStep,
  SplitCellStep,
  TABLE_STEP_SPECS,
  UpdateCellStep,
} from '@easyink/material-table-kernel/steps'
import { isTableNode } from '@easyink/schema'
import { createTableStaticNode, TABLE_STATIC_CAPABILITIES, TABLE_STATIC_TYPE } from './schema'

const getVM = memoViewModel((doc, nodeId) => {
  const node = doc.elements.find(e => e.id === nodeId)
  return node && isTableNode(node) ? buildTableStaticViewModel(node as TableNode) : null
})

function findTable(state: EditorState, nodeId: string): TableNode | null {
  const n = state.doc.elements.find(e => e.id === nodeId)
  return n && isTableNode(n) ? (n as TableNode) : null
}

export const tableStaticCommands = {
  insertRowBelow(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [row] = s.path as readonly [number, number]
    return state.tr.step(new InsertRowStep(s.nodeId, row + 1))
  },
  insertRowAbove(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [row] = s.path as readonly [number, number]
    return state.tr.step(new InsertRowStep(s.nodeId, row))
  },
  removeRow(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [row] = s.path as readonly [number, number]
    return state.tr.step(new RemoveRowStep(s.nodeId, row))
  },
  insertColRight(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [, col] = s.path as readonly [number, number]
    return state.tr.step(new InsertColStep(s.nodeId, col + 1))
  },
  insertColLeft(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [, col] = s.path as readonly [number, number]
    return state.tr.step(new InsertColStep(s.nodeId, col))
  },
  removeCol(state: EditorState): Transaction | null {
    const s = state.selection
    if (s.type !== 'table-cell' || !s.nodeId)
      return null
    const [, col] = s.path as readonly [number, number]
    return state.tr.step(new RemoveColStep(s.nodeId, col))
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
  bindStaticCell(
    state: EditorState,
    args: { nodeId: string, row: number, col: number, binding: BindingRef },
  ): Transaction | null {
    return state.tr.step(new SetCellBindingStep(args.nodeId, args.row, args.col, 'staticBinding', args.binding))
  },
  clearStaticCellBinding(
    state: EditorState,
    args: { nodeId: string, row: number, col: number },
  ): Transaction | null {
    return state.tr.step(new SetCellBindingStep(args.nodeId, args.row, args.col, 'staticBinding', undefined))
  },
  mergeCells(
    state: EditorState,
    args: { nodeId: string, row: number, col: number, rowSpan: number, colSpan: number },
  ): Transaction | null {
    return state.tr.step(new MergeCellsStep(args.nodeId, args.row, args.col, args.rowSpan, args.colSpan))
  },
  splitCell(
    state: EditorState,
    args: { nodeId: string, row: number, col: number },
  ): Transaction | null {
    return state.tr.step(new SplitCellStep(args.nodeId, args.row, args.col))
  },
}

const viewPlugin: PluginView = {
  render(ctx: ViewContext) {
    const { state, utils } = ctx
    const sel = state.selection
    for (const node of state.doc.elements) {
      if (node.type !== TABLE_STATIC_TYPE)
        continue
      const html = renderTableHtml({
        topology: (node as TableNode).table.topology,
        props: (node as TableNode).props as any,
        unit: utils.unit,
        elementHeight: (node as TableNode).height,
        tableStyle: 'height:100%',
        cellRenderer: (cell) => {
          if (cell.staticBinding && utils.getBindingLabel)
            return `<span>{#${escapeHtml(utils.getBindingLabel(cell.staticBinding))}}</span>`
          return cell.content?.text || ''
        },
      })
      ctx.layers.content.push(
        h('div', {
          'class': 'easyink-table-static-node',
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

function propertyPanel(ctx: PropertyPanelContext): PanelContribution[] {
  const { state, dispatch, t } = ctx
  const sel = state.selection
  if (sel.type !== 'table-cell' || !sel.nodeId)
    return []
  const node = findTable(state, sel.nodeId)
  if (!node || node.type !== TABLE_STATIC_TYPE)
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
        const tr = tableStaticCommands.updateCellProp(state, { nodeId: node.id, row, col, key, value })
        if (tr)
          dispatch(tr)
      },
      binding: cell.staticBinding ?? null,
      clearBinding() {
        const tr = tableStaticCommands.clearStaticCellBinding(state, { nodeId: node.id, row, col })
        if (tr)
          dispatch(tr)
      },
    },
  ]
}

const keymap = {
  'Mod-Enter': (state: EditorState, dispatch: (tr: Transaction) => void) => {
    const tr = tableStaticCommands.insertRowBelow(state)
    if (!tr)
      return false
    dispatch(tr)
    return true
  },
  'Escape': (state: EditorState, dispatch: (tr: Transaction) => void) => {
    if (state.selection.type !== 'table-cell')
      return false
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

const dropHandler = {
  onDragOver(ctx: { state: EditorState, field: { fieldLabel?: string }, local: { x: number, y: number }, node: MaterialNode }) {
    if (!isTableNode(ctx.node) || ctx.node.type !== TABLE_STATIC_TYPE)
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
    if (!isTableNode(ctx.node) || ctx.node.type !== TABLE_STATIC_TYPE)
      return
    const vm = getVM(ctx.state.doc, ctx.node.id)
    if (!vm)
      return
    const hit = vm.hitTest(ctx.local)
    if (!hit)
      return
    const [row, col] = hit.path
    const tr = tableStaticCommands.bindStaticCell(ctx.state, {
      nodeId: ctx.node.id,
      row,
      col,
      binding: ctx.field,
    })
    if (tr)
      ctx.dispatch(tr.setSelection(tableCellSelection(ctx.node.id, row, col)))
  },
}

const tableStaticPlugin: AnyPlugin = {
  key: 'material-table-static',
  selectionTypes: [tableCellSelectionSpec],
  stepTypes: TABLE_STEP_SPECS,
  view: viewPlugin,
  keymap,
  propertyPanel,
  dropHandler,
  commands: tableStaticCommands as any,
  toolbar: createTableToolbarContribution({
    ownerKey: 'material-table-static',
    allowMergeSplit: true,
  }),
}

export const tableStaticMaterial: MaterialExtension = defineMaterial({
  type: TABLE_STATIC_TYPE,
  category: 'static',
  createDefaultNode: createTableStaticNode as any,
  plugins: [tableStaticPlugin],
  capabilities: TABLE_STATIC_CAPABILITIES,
})
