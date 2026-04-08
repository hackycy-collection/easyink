<script setup lang="ts">
import type { TableNode } from '@easyink/schema'
import { computeCellRect, computeColBorderPositions, computeRowBorderPositions } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'
import { useTableColumnResize, useTableRowResize } from '../composables'

const store = useDesignerStore()

const props = defineProps<{
  getPageEl: () => HTMLElement | null
}>()

const { onColumnBorderPointerDown } = useTableColumnResize({
  store,
  getPageEl: props.getPageEl,
})

const { onRowBorderPointerDown } = useTableRowResize({
  store,
  getPageEl: props.getPageEl,
})

const tableNode = computed<TableNode | null>(() => {
  const id = store.tableEditing.tableId
  if (!id)
    return null
  const node = store.getElementById(id)
  if (!node || !isTableNode(node))
    return null
  return node
})

const unit = computed(() => store.schema.unit)

const colBorderXList = computed(() => {
  const node = tableNode.value
  if (!node)
    return []
  return computeColBorderPositions(node.table.topology.columns, node.width)
})

const rowBorderYList = computed(() => {
  const node = tableNode.value
  if (!node)
    return []
  return computeRowBorderPositions(node.table.topology.rows, node.height)
})

const cellHighlight = computed(() => {
  const node = tableNode.value
  const cellPath = store.tableEditing.cellPath
  if (!node || !cellPath)
    return null
  return computeCellRect(node.table.topology, node.width, node.height, cellPath.row, cellPath.col)
})

const showCellHighlight = computed(() => {
  return store.tableEditing.phase === 'cell-selected' || store.tableEditing.phase === 'content-editing'
})
</script>

<template>
  <div
    v-if="tableNode"
    class="ei-table-overlay"
    :style="{
      left: `${tableNode.x}${unit}`,
      top: `${tableNode.y}${unit}`,
      width: `${tableNode.width}${unit}`,
      height: `${tableNode.height}${unit}`,
    }"
  >
    <!-- Column grid lines -->
    <div
      v-for="(x, i) in colBorderXList"
      :key="`col-${i}`"
      class="ei-table-overlay__col-line"
      :style="{ left: `${x}${unit}` }"
    />

    <!-- Row grid lines -->
    <div
      v-for="(y, i) in rowBorderYList"
      :key="`row-${i}`"
      class="ei-table-overlay__row-line"
      :style="{ top: `${y}${unit}` }"
    />

    <!-- Column resize handles -->
    <div
      v-for="(x, i) in colBorderXList"
      :key="`col-handle-${i}`"
      class="ei-table-overlay__col-handle"
      :style="{ left: `${x}${unit}` }"
      @pointerdown="onColumnBorderPointerDown($event, tableNode!, i)"
    />

    <!-- Row resize handles -->
    <div
      v-for="(y, i) in rowBorderYList"
      :key="`row-handle-${i}`"
      class="ei-table-overlay__row-handle"
      :style="{ top: `${y}${unit}` }"
      @pointerdown="onRowBorderPointerDown($event, tableNode!, i)"
    />

    <!-- Selected cell highlight -->
    <div
      v-if="showCellHighlight && cellHighlight"
      class="ei-table-overlay__cell-highlight"
      :style="{
        left: `${cellHighlight.x}${unit}`,
        top: `${cellHighlight.y}${unit}`,
        width: `${cellHighlight.w}${unit}`,
        height: `${cellHighlight.h}${unit}`,
      }"
    />
  </div>
</template>

<style scoped>
.ei-table-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 10;
}

.ei-table-overlay__col-line,
.ei-table-overlay__row-line {
  position: absolute;
  pointer-events: none;
}

.ei-table-overlay__col-line {
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(24, 144, 255, 0.3);
}

.ei-table-overlay__row-line {
  left: 0;
  width: 100%;
  height: 1px;
  background: rgba(24, 144, 255, 0.3);
}

/* Column resize handle: tall thin hit area */
.ei-table-overlay__col-handle {
  position: absolute;
  top: 0;
  width: 6px;
  height: 100%;
  margin-left: -3px;
  cursor: col-resize;
  pointer-events: auto;
  z-index: 2;
}

.ei-table-overlay__col-handle:hover {
  background: rgba(24, 144, 255, 0.15);
}

/* Row resize handle: wide thin hit area */
.ei-table-overlay__row-handle {
  position: absolute;
  left: 0;
  width: 100%;
  height: 6px;
  margin-top: -3px;
  cursor: row-resize;
  pointer-events: auto;
  z-index: 2;
}

.ei-table-overlay__row-handle:hover {
  background: rgba(24, 144, 255, 0.15);
}

/* Cell highlight */
.ei-table-overlay__cell-highlight {
  position: absolute;
  border: 2px solid var(--ei-primary, #1890ff);
  background: rgba(24, 144, 255, 0.08);
  pointer-events: none;
  z-index: 1;
}
</style>
