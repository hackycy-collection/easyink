<script setup lang="ts">
import type { TableNode } from '@easyink/schema'
import { computeCellRect } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'
import { UpdateTableCellCommand } from '@easyink/core'
import { computed, ref, watch } from 'vue'
import { useDesignerStore } from '../composables'

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

const cellRect = computed(() => {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return null
  const rect = computeCellRect(node.table.topology, node.width, node.height, cp.row, cp.col)
  if (!rect)
    return null
  return { x: node.x + rect.x, y: node.y + rect.y, w: rect.w, h: rect.h }
})

/** Cell style to match rendered cell appearance. */
const cellStyle = computed(() => {
  const node = tableNode.value
  if (!node)
    return {}
  const p = node.props as Record<string, unknown>
  return {
    fontSize: `${p.fontSize ?? 12}pt`,
    color: (p.color as string) || '#000000',
    padding: `${p.cellPadding ?? 4}px`,
  }
})

/** Current cell text value. */
const editValue = ref('')
/** Guard to prevent blur-triggered commit after an explicit commit/cancel. */
let committed = false
/**
 * Snapshot of node and cellPath at init time.
 * This ensures commit() can still save even if the store state has been
 * cleared (e.g. exitDeepEditing called on pointerdown before blur fires).
 */
let snapshotNode: TableNode | null = null
let snapshotCellPath: { row: number, col: number } | null = null

function initValue() {
  const node = tableNode.value
  const cp = cellPath.value
  if (!node || !cp)
    return
  snapshotNode = node
  snapshotCellPath = { row: cp.row, col: cp.col }
  const cell = node.table.topology.rows[cp.row]?.cells[cp.col]
  editValue.value = cell?.content?.text ?? ''
  committed = false
}

function commit() {
  if (committed)
    return
  committed = true

  const node = snapshotNode
  const cp = snapshotCellPath
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

  // Only exit content editing if still in that phase (may already be idle)
  if (store.tableEditing.phase === 'content-editing') {
    store.exitContentEditing()
  }
}

function cancel() {
  committed = true
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

/**
 * Watch inputRef: when the input element becomes available in the DOM,
 * focus it immediately. This is more reliable than onMounted + nextTick
 * because the template ref callback fires after the DOM is patched.
 */
watch(inputRef, (el) => {
  if (el) {
    initValue()
    el.focus()
    el.select()
  }
}, { flush: 'post' })
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
    @pointerdown.stop
    @mousedown.stop
    @click.stop
  >
    <input
      ref="inputRef"
      v-model="editValue"
      class="ei-table-cell-editor__input"
      :style="cellStyle"
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
  outline: none;
}
</style>
