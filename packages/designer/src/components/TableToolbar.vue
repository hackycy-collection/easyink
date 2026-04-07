<script setup lang="ts">
import type { TableNode } from '@easyink/schema'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'
import { isTableNode } from '@easyink/schema'
import {
  InsertTableColumnCommand,
  InsertTableRowCommand,
  MergeTableCellsCommand,
  RemoveTableColumnCommand,
  RemoveTableRowCommand,
  SplitTableCellCommand,
} from '@easyink/core'

const store = useDesignerStore()

const tableNode = computed<TableNode | null>(() => {
  const id = store.tableEditing.tableId
  if (!id)
    return null
  const node = store.getElementById(id)
  if (!node || !isTableNode(node))
    return null
  return node
})

const cellPath = computed(() => store.tableEditing.cellPath)
const unit = computed(() => store.schema.unit)

const visible = computed(() => {
  const phase = store.tableEditing.phase
  return (phase === 'cell-selected' || phase === 'content-editing') && tableNode.value
})

/** Whether the current cell has a merge that can be split. */
const canSplit = computed(() => {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return false
  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  if (!cell)
    return false
  return (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1
})

const canRemoveRow = computed(() => {
  const node = tableNode.value
  return node ? node.table.topology.rows.length > 1 : false
})

const canRemoveCol = computed(() => {
  const node = tableNode.value
  return node ? node.table.topology.columns.length > 1 : false
})

function insertRowAbove() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const colCount = node.table.topology.columns.length
  const avgHeight = node.table.topology.rows[cp.row]?.height ?? 24
  const newRow = { height: avgHeight, cells: Array.from({ length: colCount }, () => ({})) }
  const cmd = new InsertTableRowCommand(node, cp.row, newRow)
  store.commands.execute(cmd)
  store.selectCell(cp.row + 1, cp.col)
}

function insertRowBelow() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const colCount = node.table.topology.columns.length
  const avgHeight = node.table.topology.rows[cp.row]?.height ?? 24
  const newRow = { height: avgHeight, cells: Array.from({ length: colCount }, () => ({})) }
  const cmd = new InsertTableRowCommand(node, cp.row + 1, newRow)
  store.commands.execute(cmd)
}

function removeRow() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp || node.table.topology.rows.length <= 1)
    return
  const cmd = new RemoveTableRowCommand(node, cp.row)
  store.commands.execute(cmd)
  const newRow = Math.min(cp.row, node.table.topology.rows.length - 1)
  store.selectCell(newRow, cp.col)
}

function insertColLeft() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const newCol = { ratio: 1 / (node.table.topology.columns.length + 1) }
  const cmd = new InsertTableColumnCommand(node, cp.col, newCol)
  store.commands.execute(cmd)
  store.selectCell(cp.row, cp.col + 1)
}

function insertColRight() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const newCol = { ratio: 1 / (node.table.topology.columns.length + 1) }
  const cmd = new InsertTableColumnCommand(node, cp.col + 1, newCol)
  store.commands.execute(cmd)
}

function removeCol() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp || node.table.topology.columns.length <= 1)
    return
  const cmd = new RemoveTableColumnCommand(node, cp.col)
  store.commands.execute(cmd)
  const newCol = Math.min(cp.col, node.table.topology.columns.length - 1)
  store.selectCell(cp.row, newCol)
}

function mergeCellRight() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  const currentColSpan = cell?.colSpan ?? 1
  const newColSpan = Math.min(currentColSpan + 1, node.table.topology.columns.length - cp.col)
  if (newColSpan <= currentColSpan)
    return
  const cmd = new MergeTableCellsCommand(node, cp.row, cp.col, newColSpan, cell?.rowSpan ?? 1)
  store.commands.execute(cmd)
}

function mergeCellDown() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  const currentRowSpan = cell?.rowSpan ?? 1
  const newRowSpan = Math.min(currentRowSpan + 1, node.table.topology.rows.length - cp.row)
  if (newRowSpan <= currentRowSpan)
    return
  const cmd = new MergeTableCellsCommand(node, cp.row, cp.col, cell?.colSpan ?? 1, newRowSpan)
  store.commands.execute(cmd)
}

function splitCell() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const cmd = new SplitTableCellCommand(node, cp.row, cp.col)
  store.commands.execute(cmd)
}
</script>

<template>
  <div
    v-if="visible && tableNode"
    class="ei-table-toolbar"
    :style="{
      left: `${tableNode.x}${unit}`,
      top: `${tableNode.y}${unit}`,
    }"
  >
    <div class="ei-table-toolbar__row">
      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.insertRowAbove')" @click="insertRowAbove">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10M8 3v10" stroke="currentColor" fill="none" stroke-width="1.5" /><path d="M3 3h10v3H3z" fill="currentColor" opacity="0.2" /></svg>
      </button>
      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.insertRowBelow')" @click="insertRowBelow">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10M8 3v10" stroke="currentColor" fill="none" stroke-width="1.5" /><path d="M3 10h10v3H3z" fill="currentColor" opacity="0.2" /></svg>
      </button>
      <button class="ei-table-toolbar__btn" :disabled="!canRemoveRow" :title="store.t('designer.table.removeRow')" @click="removeRow">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10" stroke="currentColor" fill="none" stroke-width="1.5" /></svg>
      </button>

      <span class="ei-table-toolbar__sep" />

      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.insertColLeft')" @click="insertColLeft">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" fill="none" stroke-width="1.5" /><path d="M3 3h3v10H3z" fill="currentColor" opacity="0.2" /></svg>
      </button>
      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.insertColRight')" @click="insertColRight">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" fill="none" stroke-width="1.5" /><path d="M10 3h3v10h-3z" fill="currentColor" opacity="0.2" /></svg>
      </button>
      <button class="ei-table-toolbar__btn" :disabled="!canRemoveCol" :title="store.t('designer.table.removeCol')" @click="removeCol">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10" stroke="currentColor" fill="none" stroke-width="1.5" /><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" fill="none" stroke-width="1" /></svg>
      </button>

      <span class="ei-table-toolbar__sep" />

      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.mergeRight')" @click="mergeCellRight">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 5h4l-2 3 2 3H6" stroke="currentColor" fill="none" stroke-width="1.5" /></svg>
      </button>
      <button class="ei-table-toolbar__btn" :title="store.t('designer.table.mergeDown')" @click="mergeCellDown">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 6v4l3-2 3 2V6" stroke="currentColor" fill="none" stroke-width="1.5" /></svg>
      </button>
      <button v-if="canSplit" class="ei-table-toolbar__btn" :title="store.t('designer.table.split')" @click="splitCell">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 8h8M8 4v8" stroke="currentColor" fill="none" stroke-width="1.5" stroke-dasharray="2 1" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-table-toolbar {
  position: absolute;
  transform: translateY(-32px);
  z-index: 12;
  pointer-events: auto;
}

.ei-table-toolbar__row {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  padding: 2px 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.ei-table-toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: var(--ei-text-primary, #333);
  padding: 0;
}

.ei-table-toolbar__btn:hover:not(:disabled) {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-table-toolbar__btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.ei-table-toolbar__sep {
  width: 1px;
  height: 16px;
  background: var(--ei-border-color, #d0d0d0);
  margin: 0 2px;
}
</style>
