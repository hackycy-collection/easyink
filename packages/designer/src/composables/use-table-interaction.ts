import type { TableNode } from '@easyink/schema'
import type { DesignerStore } from '../store/designer-store'
import { UnitManager } from '@easyink/core'
import { getNextCell, hitTestGridCell, resolveMergeOwner } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

export interface TableInteractionContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
}

/**
 * Table interaction composable: state machine driver + cell hitTest.
 * Architecture ref: 10.7 (table deep editing)
 */
export function useTableInteraction(ctx: TableInteractionContext) {
  /**
   * Handle click on a table element's body area to determine cell selection.
   * Call this when a table is already in table-selected phase and user clicks inside it.
   */
  function onTableCellClick(e: PointerEvent, tableNode: TableNode, elementEl: HTMLElement) {
    const { store } = ctx
    const cell = hitTestCell(e, tableNode, elementEl, store)
    if (!cell)
      return

    store.selectCell(cell.row, cell.col)
  }

  /** Handle double-click on a cell to enter content editing. */
  function onTableCellDoubleClick(_e: PointerEvent, _tableNode: TableNode) {
    const { store } = ctx
    if (store.tableEditing.phase === 'cell-selected') {
      store.enterContentEditing()
    }
  }

  /** Handle keyboard events during table editing. */
  function onTableKeyDown(e: KeyboardEvent) {
    const { store } = ctx
    const { phase, tableId, cellPath } = store.tableEditing

    if (phase === 'idle')
      return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (phase === 'content-editing') {
        store.exitContentEditing()
      }
      else if (phase === 'cell-selected') {
        // Back to table-selected
        store.tableEditing.phase = 'table-selected'
        store.tableEditing.cellPath = undefined
        store.tableEditing.sectionKind = undefined
      }
      else if (phase === 'table-selected') {
        store.exitDeepEditing()
      }
      return
    }

    if (phase === 'cell-selected' && cellPath && tableId) {
      const node = store.getElementById(tableId)
      if (!node || !isTableNode(node))
        return

      if (e.key === 'Tab') {
        e.preventDefault()
        const next = getNextCell(node.table.topology, cellPath.row, cellPath.col)
        store.selectCell(next.row, next.col)
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        store.enterContentEditing()
        return
      }

      if (e.key === 'Delete') {
        e.preventDefault()
        // Clear cell content - handled by TableCellEditor or caller
      }
    }
  }

  /** Handle click outside the table to exit deep editing. */
  function onOutsideClick() {
    const { store } = ctx
    if (store.isInDeepEditing) {
      store.exitDeepEditing()
    }
  }

  return {
    onTableCellClick,
    onTableCellDoubleClick,
    onTableKeyDown,
    onOutsideClick,
  }
}

/**
 * HitTest: determine which cell was clicked based on pointer position.
 * Converts screen coordinates to document coordinates, then delegates
 * to kernel's hitTestGridCell + resolveMergeOwner for the pure geometry part.
 */
function hitTestCell(
  e: PointerEvent,
  tableNode: TableNode,
  elementEl: HTMLElement,
  store: DesignerStore,
): { row: number, col: number } | null {
  const pageEl = elementEl.closest('.ei-canvas-page') as HTMLElement | null
  if (!pageEl)
    return null

  const unitManager = new UnitManager(store.schema.unit)
  const zoom = store.workbench.viewport.zoom
  const pageRect = pageEl.getBoundingClientRect()

  // Convert pointer to document coordinates
  const docX = unitManager.screenToDocument(e.clientX, pageRect.left, 0, zoom)
  const docY = unitManager.screenToDocument(e.clientY, pageRect.top, 0, zoom)

  // Relative to table element
  const relX = docX - tableNode.x
  const relY = docY - tableNode.y

  const gridCell = hitTestGridCell(tableNode.table.topology, tableNode.width, tableNode.height, relX, relY)
  if (!gridCell)
    return null

  return resolveMergeOwner(tableNode.table.topology, gridCell.row, gridCell.col)
}
