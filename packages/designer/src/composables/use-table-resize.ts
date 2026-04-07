import type { TableNode } from '@easyink/schema'
import type { DesignerStore } from '../store/designer-store'
import { ResizeTableColumnCommand, ResizeTableRowCommand, UnitManager } from '@easyink/core'

export interface TableResizeContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
}

/**
 * Column resize composable.
 * Architecture ref: 10.7.6 (column resize interaction semantics)
 * Drag column right border -> modify current column ratio, push right side, change element.width.
 */
export function useTableColumnResize(ctx: TableResizeContext) {
  function onColumnBorderPointerDown(e: PointerEvent, tableNode: TableNode, colIndex: number) {
    e.stopPropagation()
    e.preventDefault()

    const { store } = ctx
    const pageEl = ctx.getPageEl()
    if (!pageEl)
      return

    const unitManager = new UnitManager(store.schema.unit)
    const zoom = store.workbench.viewport.zoom

    const startScreenX = e.clientX
    const startRatio = tableNode.table.topology.columns[colIndex]!.ratio
    const startWidth = tableNode.width

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    function onPointerMove(ev: PointerEvent) {
      const deltaScreen = ev.clientX - startScreenX
      const deltaDoc = unitManager.screenToDocument(deltaScreen, 0, 0, zoom)

      // New ratio = start ratio + delta / startWidth
      const newRatio = Math.max(4 / startWidth, startRatio + deltaDoc / startWidth)
      const ratioDelta = newRatio - startRatio
      const newElementWidth = startWidth + ratioDelta * startWidth

      // Apply live (for visual feedback)
      tableNode.table.topology.columns[colIndex]!.ratio = newRatio
      tableNode.width = newElementWidth
    }

    function onPointerUp(ev: PointerEvent) {
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)

      const currentRatio = tableNode.table.topology.columns[colIndex]!.ratio
      const currentWidth = tableNode.width

      // Reset to start values, then execute command (so undo works)
      tableNode.table.topology.columns[colIndex]!.ratio = startRatio
      tableNode.width = startWidth

      if (currentRatio !== startRatio) {
        const cmd = new ResizeTableColumnCommand(tableNode, colIndex, currentRatio, currentWidth)
        store.commands.execute(cmd)
      }
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
  }

  return { onColumnBorderPointerDown }
}

/**
 * Row resize composable.
 * Drag row bottom border -> modify row.height, change element.height.
 */
export function useTableRowResize(ctx: TableResizeContext) {
  function onRowBorderPointerDown(e: PointerEvent, tableNode: TableNode, rowIndex: number) {
    e.stopPropagation()
    e.preventDefault()

    const { store } = ctx
    const pageEl = ctx.getPageEl()
    if (!pageEl)
      return

    const unitManager = new UnitManager(store.schema.unit)
    const zoom = store.workbench.viewport.zoom

    const startScreenY = e.clientY
    const startRowHeight = tableNode.table.topology.rows[rowIndex]!.height
    const startElementHeight = tableNode.height

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const MIN_ROW_HEIGHT = 4

    function onPointerMove(ev: PointerEvent) {
      const deltaScreen = ev.clientY - startScreenY
      const deltaDoc = unitManager.screenToDocument(deltaScreen, 0, 0, zoom)

      const newHeight = Math.max(MIN_ROW_HEIGHT, startRowHeight + deltaDoc)
      const heightDelta = newHeight - startRowHeight

      // Apply live
      tableNode.table.topology.rows[rowIndex]!.height = newHeight
      tableNode.height = startElementHeight + heightDelta
    }

    function onPointerUp(ev: PointerEvent) {
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)

      const currentHeight = tableNode.table.topology.rows[rowIndex]!.height

      // Reset, then execute command
      tableNode.table.topology.rows[rowIndex]!.height = startRowHeight
      tableNode.height = startElementHeight

      if (currentHeight !== startRowHeight) {
        const cmd = new ResizeTableRowCommand(tableNode, rowIndex, currentHeight)
        store.commands.execute(cmd)
      }
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
  }

  return { onRowBorderPointerDown }
}
