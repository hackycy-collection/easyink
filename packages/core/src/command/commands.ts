import type {
  AddBackgroundLayerParams,
  AddElementParams,
  Command,
  DeleteTableColumnParams,
  DeleteTableRowParams,
  EditTableCellParams,
  InsertTableColumnParams,
  InsertTableRowParams,
  MoveElementParams,
  RemoveBackgroundLayerParams,
  RemoveElementParams,
  ReorderBackgroundLayerParams,
  ReorderElementParams,
  ResizeElementParams,
  RotateElementParams,
  SchemaOperations,
  UpdateBackgroundLayerParams,
  UpdateBindingParams,
  UpdateLockParams,
  UpdatePageSettingsParams,
  UpdatePropsParams,
  UpdateStyleParams,
  UpdateVisibilityParams,
} from './types'
import { generateId } from '@easyink/shared'

/**
 * 移动元素命令
 * mergeable: 连续拖拽合并
 */
export function createMoveElementCommand(
  params: MoveElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'move-element',
    description: `移动元素 ${params.elementId}`,
    mergeable: true,
    execute() {
      ops.updateElementLayout(params.elementId, {
        x: params.newX,
        y: params.newY,
      })
    },
    undo() {
      ops.updateElementLayout(params.elementId, {
        x: params.oldX,
        y: params.oldY,
      })
    },
    merge(next: Command) {
      if (next.type !== 'move-element')
        return null
      const nextParams = (next as any)._params as MoveElementParams
      if (nextParams.elementId !== params.elementId)
        return null
      return createMoveElementCommand(
        { ...params, newX: nextParams.newX, newY: nextParams.newY },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: MoveElementParams }
}

/**
 * 调整元素尺寸命令
 * mergeable: 连续缩放合并
 */
export function createResizeElementCommand(
  params: ResizeElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'resize-element',
    description: `调整元素尺寸 ${params.elementId}`,
    mergeable: true,
    execute() {
      ops.updateElementLayout(params.elementId, {
        width: params.newWidth,
        height: params.newHeight,
      })
    },
    undo() {
      ops.updateElementLayout(params.elementId, {
        width: params.oldWidth,
        height: params.oldHeight,
      })
    },
    merge(next: Command) {
      if (next.type !== 'resize-element')
        return null
      const nextParams = (next as any)._params as ResizeElementParams
      if (nextParams.elementId !== params.elementId)
        return null
      return createResizeElementCommand(
        { ...params, newWidth: nextParams.newWidth, newHeight: nextParams.newHeight },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: ResizeElementParams }
}

/**
 * 旋转元素命令
 * mergeable: 连续旋转合并
 */
export function createRotateElementCommand(
  params: RotateElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'rotate-element',
    description: `旋转元素 ${params.elementId}`,
    mergeable: true,
    execute() {
      ops.updateElementLayout(params.elementId, {
        rotation: params.newRotation,
      })
    },
    undo() {
      ops.updateElementLayout(params.elementId, {
        rotation: params.oldRotation,
      })
    },
    merge(next: Command) {
      if (next.type !== 'rotate-element')
        return null
      const nextParams = (next as any)._params as RotateElementParams
      if (nextParams.elementId !== params.elementId)
        return null
      return createRotateElementCommand(
        { ...params, newRotation: nextParams.newRotation },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: RotateElementParams }
}

/**
 * 修改元素属性命令
 * mergeable: 同属性连续修改合并
 */
export function createUpdatePropsCommand(
  params: UpdatePropsParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'update-props',
    description: `修改元素属性 ${params.elementId}`,
    mergeable: true,
    execute() {
      ops.updateElementProps(params.elementId, params.newProps)
    },
    undo() {
      ops.updateElementProps(params.elementId, params.oldProps)
    },
    merge(next: Command) {
      if (next.type !== 'update-props')
        return null
      const nextParams = (next as any)._params as UpdatePropsParams
      if (nextParams.elementId !== params.elementId)
        return null
      return createUpdatePropsCommand(
        { ...params, newProps: nextParams.newProps },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: UpdatePropsParams }
}

/**
 * 修改元素样式命令
 * mergeable: 同样式连续修改合并
 */
export function createUpdateStyleCommand(
  params: UpdateStyleParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'update-style',
    description: `修改元素样式 ${params.elementId}`,
    mergeable: true,
    execute() {
      ops.updateElementStyle(params.elementId, params.newStyle)
    },
    undo() {
      ops.updateElementStyle(params.elementId, params.oldStyle)
    },
    merge(next: Command) {
      if (next.type !== 'update-style')
        return null
      const nextParams = (next as any)._params as UpdateStyleParams
      if (nextParams.elementId !== params.elementId)
        return null
      return createUpdateStyleCommand(
        { ...params, newStyle: nextParams.newStyle },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: UpdateStyleParams }
}

/**
 * 添加元素命令
 */
export function createAddElementCommand(
  params: AddElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'add-element',
    description: `添加元素 ${params.element.type}`,
    execute() {
      ops.addElement(params.element, params.index)
    },
    undo() {
      ops.removeElement(params.element.id)
    },
  }
}

/**
 * 删除元素命令
 */
export function createRemoveElementCommand(
  params: RemoveElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'remove-element',
    description: `删除元素 ${params.element.type}`,
    execute() {
      ops.removeElement(params.element.id)
    },
    undo() {
      ops.addElement(params.element, params.index)
    },
  }
}

/**
 * 调整层级命令
 */
export function createReorderElementCommand(
  params: ReorderElementParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'reorder-element',
    description: `调整层级 ${params.elementId}`,
    execute() {
      ops.reorderElement(params.elementId, params.newIndex)
    },
    undo() {
      ops.reorderElement(params.elementId, params.oldIndex)
    },
  }
}

/**
 * 修改数据绑定命令
 */
export function createUpdateBindingCommand(
  params: UpdateBindingParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'update-binding',
    description: `修改数据绑定 ${params.elementId}`,
    execute() {
      ops.updateElementBinding(params.elementId, params.newBinding)
    },
    undo() {
      ops.updateElementBinding(params.elementId, params.oldBinding)
    },
  }
}

/**
 * 修改页面设置命令
 */
export function createUpdatePageSettingsCommand(
  params: UpdatePageSettingsParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'update-page-settings',
    description: '修改页面设置',
    execute() {
      ops.updatePageSettings(params.newSettings)
    },
    undo() {
      ops.updatePageSettings(params.oldSettings)
    },
  }
}

/**
 * 切换元素显示/隐藏命令
 */
export function createToggleLockCommand(
  params: UpdateLockParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'toggle-lock',
    description: `切换锁定 ${params.elementId}`,
    execute() {
      ops.updateElementLock(params.elementId, params.newLocked)
    },
    undo() {
      ops.updateElementLock(params.elementId, params.oldLocked)
    },
  }
}

/**
 * 切换元素显示/隐藏命令
 */
export function createToggleVisibilityCommand(
  params: UpdateVisibilityParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'toggle-visibility',
    description: `切换显示 ${params.elementId}`,
    execute() {
      ops.updateElementVisibility(params.elementId, params.newHidden)
    },
    undo() {
      ops.updateElementVisibility(params.elementId, params.oldHidden)
    },
  }
}

/**
 * 添加背景层命令
 */
export function createAddBackgroundLayerCommand(
  params: AddBackgroundLayerParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'add-background-layer',
    description: '添加背景层',
    execute() {
      ops.addBackgroundLayer(params.layer, params.index)
    },
    undo() {
      ops.removeBackgroundLayer(params.index)
    },
  }
}

/**
 * 删除背景层命令
 */
export function createRemoveBackgroundLayerCommand(
  params: RemoveBackgroundLayerParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'remove-background-layer',
    description: '删除背景层',
    execute() {
      ops.removeBackgroundLayer(params.index)
    },
    undo() {
      ops.addBackgroundLayer(params.layer, params.index)
    },
  }
}

/**
 * 修改背景层命令
 */
export function createUpdateBackgroundLayerCommand(
  params: UpdateBackgroundLayerParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'update-background-layer',
    description: '修改背景层',
    execute() {
      ops.updateBackgroundLayer(params.index, params.newLayer)
    },
    undo() {
      ops.updateBackgroundLayer(params.index, params.oldLayer)
    },
  }
}

/**
 * 调整背景层顺序命令
 */
export function createReorderBackgroundLayerCommand(
  params: ReorderBackgroundLayerParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'reorder-background-layer',
    description: '调整背景层顺序',
    execute() {
      ops.reorderBackgroundLayer(params.fromIndex, params.toIndex)
    },
    undo() {
      ops.reorderBackgroundLayer(params.toIndex, params.fromIndex)
    },
  }
}

// ─── 静态表格编辑命令 ───

/**
 * 插入表格行命令
 *
 * 在 rowIndex 位置插入空行，将所有 >= rowIndex 的 cell key 行号 +1
 */
export function createInsertTableRowCommand(
  params: InsertTableRowParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'insert-table-row',
    description: `插入表格行 ${params.rowIndex}`,
    execute() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      const rowCount = (el.props.rowCount as number) ?? 0
      const shifted = shiftCellsForInsertRow(cells, params.rowIndex)
      ops.updateElementProps(params.elementId, { cells: shifted, rowCount: rowCount + 1 })
    },
    undo() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      const rowCount = (el.props.rowCount as number) ?? 0
      const shifted = shiftCellsForDeleteRow(cells, params.rowIndex)
      ops.updateElementProps(params.elementId, { cells: shifted, rowCount: rowCount - 1 })
    },
  }
}

/**
 * 删除表格行命令
 */
export function createDeleteTableRowCommand(
  params: DeleteTableRowParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'delete-table-row',
    description: `删除表格行 ${params.rowIndex}`,
    execute() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      const rowCount = (el.props.rowCount as number) ?? 0
      const shifted = shiftCellsForDeleteRow(cells, params.rowIndex)
      ops.updateElementProps(params.elementId, { cells: shifted, rowCount: rowCount - 1 })
    },
    undo() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      const rowCount = (el.props.rowCount as number) ?? 0
      const shifted = shiftCellsForInsertRow(cells, params.rowIndex)
      // 恢复删除的 cells
      for (const [key, cell] of Object.entries(params.deletedCells)) {
        shifted[key] = cell
      }
      ops.updateElementProps(params.elementId, { cells: shifted, rowCount: rowCount + 1 })
    },
  }
}

/**
 * 插入表格列命令
 */
export function createInsertTableColumnCommand(
  params: InsertTableColumnParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'insert-table-column',
    description: `插入表格列 ${params.colIndex}`,
    execute() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const columns = [...(el.props.columns as Array<{ key: string, title: string, width: number }> ?? [])]
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      columns.splice(params.colIndex, 0, params.column)
      const shifted = shiftCellsForInsertCol(cells, params.colIndex)
      ops.updateElementProps(params.elementId, { columns, cells: shifted })
    },
    undo() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const columns = [...(el.props.columns as Array<{ key: string, title: string, width: number }> ?? [])]
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      columns.splice(params.colIndex, 1)
      const shifted = shiftCellsForDeleteCol(cells, params.colIndex)
      ops.updateElementProps(params.elementId, { columns, cells: shifted })
    },
  }
}

/**
 * 删除表格列命令
 */
export function createDeleteTableColumnCommand(
  params: DeleteTableColumnParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'delete-table-column',
    description: `删除表格列 ${params.colIndex}`,
    execute() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const columns = [...(el.props.columns as Array<{ key: string, title: string, width: number }> ?? [])]
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      columns.splice(params.colIndex, 1)
      const shifted = shiftCellsForDeleteCol(cells, params.colIndex)
      ops.updateElementProps(params.elementId, { columns, cells: shifted })
    },
    undo() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const columns = [...(el.props.columns as Array<{ key: string, title: string, width: number }> ?? [])]
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      columns.splice(params.colIndex, 0, params.deletedColumn)
      const shifted = shiftCellsForInsertCol(cells, params.colIndex)
      for (const [key, cell] of Object.entries(params.deletedCells)) {
        shifted[key] = cell
      }
      ops.updateElementProps(params.elementId, { columns, cells: shifted })
    },
  }
}

/**
 * 编辑表格单元格命令
 */
export function createEditTableCellCommand(
  params: EditTableCellParams,
  ops: SchemaOperations,
): Command {
  return {
    id: generateId(),
    type: 'edit-table-cell',
    description: `编辑单元格 ${params.cellKey}`,
    mergeable: true,
    execute() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      if (params.newCell) {
        cells[params.cellKey] = params.newCell
      }
      else {
        delete cells[params.cellKey]
      }
      ops.updateElementProps(params.elementId, { cells })
    },
    undo() {
      const el = ops.getElement(params.elementId)
      if (!el)
        return
      const cells = { ...(el.props.cells as Record<string, unknown> ?? {}) }
      if (params.oldCell) {
        cells[params.cellKey] = params.oldCell
      }
      else {
        delete cells[params.cellKey]
      }
      ops.updateElementProps(params.elementId, { cells })
    },
    merge(next: Command) {
      if (next.type !== 'edit-table-cell')
        return null
      const nextParams = (next as any)._params as EditTableCellParams
      if (nextParams.elementId !== params.elementId || nextParams.cellKey !== params.cellKey)
        return null
      return createEditTableCellCommand(
        { ...params, newCell: nextParams.newCell },
        ops,
      )
    },
    get _params() { return params },
  } as Command & { _params: EditTableCellParams }
}

// ─── 表格 cell shift 辅助 ───

function shiftCellsForInsertRow(
  cells: Record<string, unknown>,
  rowIndex: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(cells)) {
    const [rStr, cStr] = key.split('-')
    const r = Number(rStr)
    const c = Number(cStr)
    if (r >= rowIndex) {
      result[`${r + 1}-${c}`] = val
    }
    else {
      result[key] = val
    }
  }
  return result
}

function shiftCellsForDeleteRow(
  cells: Record<string, unknown>,
  rowIndex: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(cells)) {
    const [rStr, cStr] = key.split('-')
    const r = Number(rStr)
    const c = Number(cStr)
    if (r === rowIndex)
      continue
    if (r > rowIndex) {
      result[`${r - 1}-${c}`] = val
    }
    else {
      result[key] = val
    }
  }
  return result
}

function shiftCellsForInsertCol(
  cells: Record<string, unknown>,
  colIndex: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(cells)) {
    const [rStr, cStr] = key.split('-')
    const r = Number(rStr)
    const c = Number(cStr)
    if (c >= colIndex) {
      result[`${r}-${c + 1}`] = val
    }
    else {
      result[key] = val
    }
  }
  return result
}

function shiftCellsForDeleteCol(
  cells: Record<string, unknown>,
  colIndex: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(cells)) {
    const [rStr, cStr] = key.split('-')
    const r = Number(rStr)
    const c = Number(cStr)
    if (c === colIndex)
      continue
    if (c > colIndex) {
      result[`${r}-${c - 1}`] = val
    }
    else {
      result[key] = val
    }
  }
  return result
}
