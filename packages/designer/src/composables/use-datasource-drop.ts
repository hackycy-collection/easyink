import type { BindingRef, TableDataSchema, TableNode } from '@easyink/schema'
import type { DesignerStore } from '../store/designer-store'
import { BindFieldCommand, BindTableSourceCommand, pointInRect, UnitManager, UpdateTableCellCommand } from '@easyink/core'
import { hitTestGridCell, resolveMergeOwner } from '@easyink/material-table-kernel'
import { isTableDataNode, isTableNode } from '@easyink/schema'

/**
 * MIME type used for datasource field drag data.
 */
export const DATASOURCE_DRAG_MIME = 'application/x-easyink-field'

export interface DatasourceFieldDragData {
  sourceId: string
  sourceName?: string
  sourceTag?: string
  fieldPath: string
  fieldKey?: string
  fieldLabel?: string
  use?: string
}

export interface DatasourceDropContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
}

/**
 * Creates drag-and-drop handlers for binding datasource fields to canvas elements.
 *
 * Architecture ref (10.8):
 * - Scalar elements: drag field onto element -> BindFieldCommand
 * - table-data: drag field onto table -> auto-set table.source on first drag,
 *   reject mismatching sourceId, bind cell via UpdateTableCellCommand
 */
export function useDatasourceDrop(ctx: DatasourceDropContext) {
  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes(DATASOURCE_DRAG_MIME))
      return
    e.preventDefault()
    if (e.dataTransfer)
      e.dataTransfer.dropEffect = 'link'
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const raw = e.dataTransfer?.getData(DATASOURCE_DRAG_MIME)
    if (!raw)
      return

    let fieldData: DatasourceFieldDragData
    try {
      fieldData = JSON.parse(raw)
    }
    catch {
      return
    }

    const { store } = ctx
    const pageEl = ctx.getPageEl()
    if (!pageEl)
      return

    const unitManager = new UnitManager(store.schema.unit)
    const zoom = store.workbench.viewport.zoom
    const pageRect = pageEl.getBoundingClientRect()

    const docX = unitManager.screenToDocument(e.clientX, pageRect.left, 0, zoom)
    const docY = unitManager.screenToDocument(e.clientY, pageRect.top, 0, zoom)

    // Hit-test: find the topmost element under the drop point
    const elements = store.getElements()
    let target = undefined as typeof elements[number] | undefined
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]!
      if (el.hidden || el.locked)
        continue
      if (pointInRect({ x: docX, y: docY }, { x: el.x, y: el.y, width: el.width, height: el.height })) {
        const mat = store.getMaterial(el.type)
        if (mat && mat.capabilities.bindable === false)
          continue
        target = el
        break
      }
    }

    if (!target)
      return

    // Handle table-data: auto-set source + cell binding
    if (isTableDataNode(target)) {
      handleTableDataDrop(store, target, fieldData, docX, docY)
      return
    }

    // Scalar element binding
    const binding: BindingRef = {
      sourceId: fieldData.sourceId,
      sourceName: fieldData.sourceName,
      sourceTag: fieldData.sourceTag,
      fieldPath: fieldData.fieldPath,
      fieldKey: fieldData.fieldKey,
      fieldLabel: fieldData.fieldLabel,
    }

    const cmd = new BindFieldCommand(store.schema.elements, target.id, binding)
    store.commands.execute(cmd)

    // Select the bound element
    store.selection.select(target.id)
  }

  return { onDragOver, onDrop }
}

function handleTableDataDrop(
  store: DesignerStore,
  target: TableNode & { table: TableDataSchema },
  fieldData: DatasourceFieldDragData,
  docX: number,
  docY: number,
): void {
  const table = target.table

  // First drag: auto-set table.source
  if (!table.source) {
    const collectionPath = getCollectionPath(fieldData.fieldPath)
    const sourceRef: BindingRef = {
      sourceId: fieldData.sourceId,
      sourceName: fieldData.sourceName,
      sourceTag: fieldData.sourceTag,
      fieldPath: collectionPath,
    }
    const tableNode = store.getElementById(target.id)
    if (!tableNode || !isTableNode(tableNode))
      return
    const cmd = new BindTableSourceCommand(tableNode, sourceRef)
    store.commands.execute(cmd)
  }
  else if (table.source.sourceId !== fieldData.sourceId) {
    // Reject: mismatching source
    return
  }

  // Hit-test cell
  const relX = docX - target.x
  const relY = docY - target.y
  const gridCell = hitTestGridCell(table.topology, target.width, target.height, relX, relY)
  if (!gridCell)
    return
  const cell = resolveMergeOwner(table.topology, gridCell.row, gridCell.col)

  // Create cell binding with auto-filled sourceId from table.source
  const currentSource = table.source ?? (store.getElementById(target.id) as { table: TableDataSchema } | undefined)?.table.source
  if (!currentSource)
    return

  const cellBinding: BindingRef = {
    sourceId: currentSource.sourceId,
    sourceName: currentSource.sourceName,
    sourceTag: currentSource.sourceTag,
    fieldPath: fieldData.fieldPath,
    fieldKey: fieldData.fieldKey,
    fieldLabel: fieldData.fieldLabel,
  }

  const tableNode = store.getElementById(target.id)
  if (!tableNode || !isTableNode(tableNode))
    return

  const cmd = new UpdateTableCellCommand(tableNode, cell.row, cell.col, { binding: cellBinding })
  store.commands.execute(cmd)
}

/** Extract collection path from a field path (e.g. 'orders.items.name' -> 'orders.items') */
function getCollectionPath(fieldPath: string): string {
  const lastDot = fieldPath.lastIndexOf('.')
  return lastDot > 0 ? fieldPath.substring(0, lastDot) : fieldPath
}
