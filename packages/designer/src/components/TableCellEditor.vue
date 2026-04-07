<script setup lang="ts">
import type { TableNode } from '@easyink/schema'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useDesignerStore } from '../composables'
import { isTableNode } from '@easyink/schema'
import { UpdateTableCellCommand } from '@easyink/core'

const store = useDesignerStore()
const inputRef = ref<HTMLInputElement | null>(null)

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
  return store.tableEditing.phase === 'content-editing' && tableNode.value && cellPath.value
})

/** The cell rect relative to the table element. */
const cellRect = computed(() => {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return null

  const { columns, rows } = node.table.topology
  if (cp.row >= rows.length || cp.col >= columns.length)
    return null

  let x = 0
  for (let c = 0; c < cp.col; c++)
    x += columns[c]!.ratio * node.width

  let y = 0
  for (let r = 0; r < cp.row; r++)
    y += rows[r]!.height

  const cell = rows[cp.row]!.cells[cp.col]
  const colSpan = cell?.colSpan ?? 1
  const rowSpan = cell?.rowSpan ?? 1

  let w = 0
  for (let c = cp.col; c < Math.min(cp.col + colSpan, columns.length); c++)
    w += columns[c]!.ratio * node.width

  let h = 0
  for (let r = cp.row; r < Math.min(cp.row + rowSpan, rows.length); r++)
    h += rows[r]!.height

  return { x: node.x + x, y: node.y + y, w, h }
})

/** Current cell text value. */
const editValue = ref('')

function initValue() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  editValue.value = cell?.content?.text ?? ''
}

function commit() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return

  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  const oldText = cell?.content?.text ?? ''
  if (editValue.value !== oldText) {
    const updates: Record<string, unknown> = {
      content: { text: editValue.value },
    }
    const cmd = new UpdateTableCellCommand(node, cp.row, cp.col, updates)
    store.commands.execute(cmd)
  }
  store.exitContentEditing()
}

function cancel() {
  store.exitContentEditing()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commit()
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
  // Stop propagation so table interaction composable doesn't intercept
  e.stopPropagation()
}

onMounted(() => {
  initValue()
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
})
</script>

<template>
  <div
    v-if="visible && cellRect"
    class="ei-table-cell-editor"
    :style="{
      left: `${cellRect.x}${unit}`,
      top: `${cellRect.y}${unit}`,
      width: `${cellRect.w}${unit}`,
      height: `${cellRect.h}${unit}`,
    }"
  >
    <input
      ref="inputRef"
      v-model="editValue"
      class="ei-table-cell-editor__input"
      @keydown="onKeyDown"
      @blur="commit"
    >
  </div>
</template>

<style scoped>
.ei-table-cell-editor {
  position: absolute;
  z-index: 13;
  pointer-events: auto;
}

.ei-table-cell-editor__input {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid var(--ei-primary, #1890ff);
  background: #fff;
  padding: 2px 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
}
</style>
