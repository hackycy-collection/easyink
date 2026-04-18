<!--
  CellOverlay：table-cell 深度编辑态统一 UI 覆盖层。

  架构：.github/architecture/22-editor-core.md §22.8。当前为 v1 Vue 版实现，
  复用 plugin protocol 的 viewModel / commands / dropHandler / propertyPanel 协议；
  EditorView 正式上位后迁移为 plugin.view.render 的 preact 实现。

  视觉层次（从下到上）：
    - container（pointer-events:none，承载 unit 坐标系）
    - 行/列 inner resize 句柄（虚拟行跳过；最后一列 / 最后一个可见行跳过）
    - 表格外边缘 resize 句柄（右/下；走 ResizeMaterialCommand 调整节点宽高）
    - 当前 cell 高亮框
    - 浮动工具栏（icons + locale title）
    - 文本编辑输入框（最高层）
-->
<script setup lang="ts">
import type { MaterialExtension, Transaction } from '@easyink/core'
import type { TableNode } from '@easyink/schema'
import { ResizeMaterialCommand } from '@easyink/core'
import {
  IconDelete,
  IconFilePen,
  IconTableInsertColLeft,
  IconTableInsertColRight,
  IconTableInsertRowAbove,
  IconTableInsertRowBelow,
  IconTableMerge,
  IconTableRemoveCol,
  IconTableRemoveRow,
  IconTableSplit,
} from '@easyink/icons'
import {
  buildTableDataViewModel,
  buildTableStaticViewModel,
  tableCellSelection,
} from '@easyink/material-table-kernel'
import { UpdateCellStep } from '@easyink/material-table-kernel/steps'
import { isTableNode } from '@easyink/schema'
import { computed, nextTick, ref, watch } from 'vue'
import { useDesignerStore } from '../composables'
import { makeBridgeState } from '../store/editor-bridge'

const store = useDesignerStore()

// ─── cellSelection + node resolution ──────────────────────────────

const selection = computed(() => store.cellSelection)

const node = computed<TableNode | null>(() => {
  const cs = selection.value
  if (!cs)
    return null
  const n = store.getElementById(cs.nodeId)
  return n && isTableNode(n) ? (n as TableNode) : null
})

const extension = computed<MaterialExtension | null>(() => {
  const n = node.value
  return n ? (store.getMaterialExtension(n.type) ?? null) : null
})

const viewModel = computed(() => {
  const n = node.value
  if (!n)
    return null
  if (n.type === 'table-data')
    return buildTableDataViewModel(n)
  if (n.type === 'table-static')
    return buildTableStaticViewModel(n)
  return null
})

const cellRect = computed(() => {
  const vm = viewModel.value
  const cs = selection.value
  if (!vm || !cs)
    return null
  return vm.rectOf([cs.row, cs.col])
})

const cell = computed(() => {
  const n = node.value
  const cs = selection.value
  if (!n || !cs)
    return null
  return n.table.topology.rows[cs.row]?.cells[cs.col] ?? null
})

// ─── styles (page-local, unit-based) ──────────────────────────────

const unit = computed(() => store.schema.unit)

const containerStyle = computed(() => {
  const n = node.value
  if (!n)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute' as const,
    left: `${n.x}${u}`,
    top: `${n.y}${u}`,
    width: `${n.width}${u}`,
    height: `${store.getVisualHeight(n)}${u}`,
    pointerEvents: 'none' as const,
    zIndex: 30,
  }
})

const highlightStyle = computed(() => {
  const r = cellRect.value
  if (!r)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute' as const,
    left: `${r.x}${u}`,
    top: `${r.y}${u}`,
    width: `${r.w}${u}`,
    height: `${r.h}${u}`,
    outline: '2px solid #1677ff',
    outlineOffset: '-1px',
    pointerEvents: 'auto' as const,
    background: 'rgba(22,119,255,0.04)',
  }
})

const toolbarStyle = computed(() => {
  const r = cellRect.value
  if (!r)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute' as const,
    left: `${r.x}${u}`,
    top: `${r.y}${u}`,
    transform: 'translateY(-100%) translateY(-8px)',
    pointerEvents: 'auto' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1px',
    padding: '2px',
    borderRadius: '4px',
    background: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: '1px solid #e5e5e5',
    whiteSpace: 'nowrap' as const,
  }
})

// ─── command bridge ────────────────────────────────────────────────

function buildTr(commandName: string, ...args: unknown[]): Transaction | null {
  const ext = extension.value
  const cs = selection.value
  if (!ext || !cs)
    return null
  const plugin = ext.plugins[0]
  const factory = plugin?.commands?.[commandName]
  if (!factory)
    return null
  const state = makeBridgeState(
    store.schema,
    tableCellSelection(cs.nodeId, cs.row, cs.col),
    ext.plugins,
  )
  return factory(state, ...args) as Transaction | null
}

function run(commandName: string, description: string, ...args: unknown[]): void {
  const tr = buildTr(commandName, ...args)
  if (tr)
    store.dispatchTransaction(tr, description)
}

// ─── rows / columns for resize handles ────────────────────────────

const vmColumns = computed(() => viewModel.value?.columns ?? [])
const vmRows = computed(() => viewModel.value?.rows ?? [])

/**
 * repeat-template 角标：仅 table-data，存在 repeat-template 行时显示。
 * 见 .github/architecture/23-table-interaction.md §23.4。
 */
const repeatBadge = computed(() => {
  const n = node.value
  if (!n || n.type !== 'table-data')
    return null
  const rows = vmRows.value
  const idx = rows.findIndex(r => r.role === 'repeat-template')
  if (idx < 0)
    return null
  const row = rows[idx]!
  return { y: row.layoutY, h: row.height }
})

// @ts-ignore
const repeatBadgeStyle = computed<Record<string, string>>(() => {
  const b = repeatBadge.value
  if (!b)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute',
    left: `calc(100% + 2mm)`,
    top: `${b.y}${u}`,
    height: `${b.h}${u}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 6px',
    fontSize: '11px',
    color: '#1677ff',
    background: 'rgba(22,119,255,0.08)',
    border: '1px solid rgba(22,119,255,0.4)',
    borderRadius: '4px',
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
    zIndex: '32',
  }
})

/** 列右边缘 x 偏移（元素 local coords） */
function colRightEdge(i: number): number {
  let x = 0
  for (let k = 0; k <= i; k++)
    x += vmColumns.value[k]?.width ?? 0
  return x
}

function colHandleStyle(i: number): Record<string, string> {
  const u = unit.value
  return {
    position: 'absolute',
    left: `calc(${colRightEdge(i)}${u} - 3px)`,
    top: '0',
    width: '6px',
    height: '100%',
    cursor: 'col-resize',
    pointerEvents: 'auto',
    zIndex: '31',
  }
}

function rowHandleStyle(row: { layoutY: number, height: number }): Record<string, string> {
  const u = unit.value
  return {
    position: 'absolute',
    left: '0',
    top: `calc(${row.layoutY + row.height}${u} - 3px)`,
    width: '100%',
    height: '6px',
    cursor: 'row-resize',
    pointerEvents: 'auto',
    zIndex: '31',
  }
}

function showColInnerHandle(i: number): boolean {
  return i < vmColumns.value.length - 1
}

function showRowInnerHandle(visualIdx: number): boolean {
  const row = vmRows.value[visualIdx]
  if (!row || row.virtual)
    return false
  if (visualIdx >= vmRows.value.length - 1)
    return false
  return true
}

// ─── inner resize interactions ────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)

// 列宽 / 行高 resize 实时 mm tooltip（.github/architecture/23-table-interaction.md §10）
const resizeTip = ref<{ x: number, y: number, text: string } | null>(null)

function formatLength(value: number): string {
  return `${value.toFixed(2)}${unit.value}`
}

function startColResize(colIdx: number, ev: PointerEvent): void {
  ev.stopPropagation()
  const n = node.value
  if (!n || !containerRef.value)
    return
  const startClientX = ev.clientX
  const rect = containerRef.value.getBoundingClientRect()
  const startRatio = n.table.topology.columns[colIdx]?.ratio ?? 0
  const totalRatio = n.table.topology.columns.reduce((s, c) => s + c.ratio, 0) || 1
  const target = ev.currentTarget as HTMLElement
  target.setPointerCapture(ev.pointerId)

  const onMove = (e: PointerEvent): void => {
    const dx = e.clientX - startClientX
    const delta = (dx / rect.width) * totalRatio
    const newRatio = Math.max(totalRatio * 0.05, Math.min(totalRatio * 0.95, startRatio + delta))
    run('resizeColumn', 'resize col', { nodeId: n.id, colIndex: colIdx, newRatio })
    const widthMm = (newRatio / totalRatio) * n.width
    resizeTip.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: formatLength(widthMm),
    }
  }
  const onUp = (): void => {
    target.releasePointerCapture(ev.pointerId)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
    resizeTip.value = null
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

function startRowResize(topologyIdx: number, ev: PointerEvent): void {
  ev.stopPropagation()
  const n = node.value
  if (!n || !containerRef.value)
    return
  const startClientY = ev.clientY
  const rect = containerRef.value.getBoundingClientRect()
  const visualHeight = store.getVisualHeight(n)
  const startHeight = n.table.topology.rows[topologyIdx]?.height ?? 0
  const target = ev.currentTarget as HTMLElement
  target.setPointerCapture(ev.pointerId)

  const onMove = (e: PointerEvent): void => {
    const dy = e.clientY - startClientY
    const dyUnit = (dy / rect.height) * visualHeight
    const newHeight = Math.max(2, startHeight + dyUnit)
    run('resizeRow', 'resize row', { nodeId: n.id, rowIndex: topologyIdx, newHeight })
    resizeTip.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: formatLength(newHeight),
    }
  }
  const onUp = (): void => {
    target.releasePointerCapture(ev.pointerId)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
    resizeTip.value = null
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

// ─── outer edge resize (table width/height) ───────────────────────

// @ts-ignore
const outerRightHandleStyle = computed<Record<string, string>>(() => {
  const n = node.value
  if (!n)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute',
    left: `calc(${n.width}${u} - 4px)`,
    top: '0',
    width: '8px',
    height: '100%',
    cursor: 'ew-resize',
    pointerEvents: 'auto',
    zIndex: '32',
  }
})

// @ts-ignore
const outerBottomHandleStyle = computed<Record<string, string>>(() => {
  const n = node.value
  if (!n)
    return { display: 'none' }
  const u = unit.value
  const visualHeight = store.getVisualHeight(n)
  return {
    position: 'absolute',
    left: '0',
    top: `calc(${visualHeight}${u} - 4px)`,
    width: '100%',
    height: '8px',
    cursor: 'ns-resize',
    pointerEvents: 'auto',
    zIndex: '32',
  }
})

function startOuterResize(axis: 'w' | 'h', ev: PointerEvent): void {
  ev.stopPropagation()
  const n = node.value
  if (!n || !containerRef.value)
    return
  const startClientX = ev.clientX
  const startClientY = ev.clientY
  const rect = containerRef.value.getBoundingClientRect()
  const visualHeight = store.getVisualHeight(n)
  const ratioX = rect.width > 0 ? n.width / rect.width : 1
  const ratioY = rect.height > 0 ? visualHeight / rect.height : 1
  const startW = n.width
  const startH = n.height
  const target = ev.currentTarget as HTMLElement
  target.setPointerCapture(ev.pointerId)

  const onMove = (e: PointerEvent): void => {
    const dxUnit = (e.clientX - startClientX) * ratioX
    const dyUnit = (e.clientY - startClientY) * ratioY
    const to = {
      x: n.x,
      y: n.y,
      width: axis === 'w' ? Math.max(10, startW + dxUnit) : n.width,
      height: axis === 'h' ? Math.max(10, startH + dyUnit) : n.height,
    }
    store.commands.execute(new ResizeMaterialCommand(store.schema.elements, n.id, to))
  }
  const onUp = (): void => {
    target.releasePointerCapture(ev.pointerId)
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

// ─── inline text editing ──────────────────────────────────────────

const editing = ref(false)
const editBuffer = ref('')
const editRef = ref<HTMLInputElement | null>(null)

watch(selection, (cs) => {
  editing.value = false
  // Notion 范式：单击普通 cell 自动进入编辑；header / 绑定 cell 仅选中。
  // 见 .github/architecture/23-table-interaction.md §23.2 (4)(5)。
  if (!cs)
    return
  const n = node.value
  if (!n)
    return
  const row = n.table.topology.rows[cs.row]
  const c = row?.cells[cs.col]
  if (!row || !c)
    return
  if (row.role === 'header')
    return
  if (c.binding || c.staticBinding)
    return
  // 异步：等节点更新后再启用 input
  nextTick(() => beginEditText())
})

function beginEditText(): void {
  const c = cell.value
  if (!c)
    return
  editing.value = true
  editBuffer.value = c.content?.text ?? ''
  nextTick(() => {
    editRef.value?.focus()
    editRef.value?.select()
  })
}

function commitEditText(): void {
  const n = node.value
  const cs = selection.value
  const c = cell.value
  if (!n || !cs || !c) {
    editing.value = false
    return
  }
  const prev = c.content?.text ?? ''
  if (prev !== editBuffer.value) {
    const step = new UpdateCellStep(n.id, cs.row, cs.col, 'content.text', editBuffer.value)
    const state = makeBridgeState(
      store.schema,
      tableCellSelection(cs.nodeId, cs.row, cs.col),
      extension.value?.plugins ?? [],
    )
    store.dispatchTransaction(state.tr.step(step), 'edit cell')
  }
  editing.value = false
}

function cancelEditText(): void {
  editing.value = false
}

const editStyle = computed(() => {
  const r = cellRect.value
  if (!r)
    return { display: 'none' }
  const u = unit.value
  return {
    position: 'absolute' as const,
    left: `${r.x}${u}`,
    top: `${r.y}${u}`,
    width: `${r.w}${u}`,
    height: `${r.h}${u}`,
    border: 'none',
    outline: '2px solid #1677ff',
    padding: '2px 4px',
    font: 'inherit',
    background: '#fff',
    zIndex: '33',
    pointerEvents: 'auto' as const,
  }
})

function onHighlightDblClick(): void {
  beginEditText()
}

// ─── toolbar capability matrix ────────────────────────────────────

const canMergeRight = computed(() => {
  const n = node.value
  const cs = selection.value
  if (!n || !cs)
    return false
  return cs.col + 1 < n.table.topology.columns.length
})

const canSplit = computed(() => {
  const c = cell.value
  if (!c)
    return false
  return Boolean((c.rowSpan && c.rowSpan > 1) || (c.colSpan && c.colSpan > 1))
})

function clearCellText(): void {
  const n = node.value
  const cs = selection.value
  if (!n || !cs)
    return
  const step = new UpdateCellStep(n.id, cs.row, cs.col, 'content.text', '')
  const state = makeBridgeState(store.schema, tableCellSelection(cs.nodeId, cs.row, cs.col), extension.value?.plugins ?? [])
  store.dispatchTransaction(state.tr.step(step), 'clear cell text')
}
</script>

<template>
  <div
    v-if="node && selection"
    ref="containerRef"
    class="ei-cell-overlay"
    data-ei-cell-overlay="true"
    :style="containerStyle"
  >
    <!-- Inner column resize handles (skip last col) -->
    <template v-for="(_c, i) in vmColumns" :key="`c${i}`">
      <div
        v-if="showColInnerHandle(i)"
        class="ei-cell-overlay__col-handle"
        :style="colHandleStyle(i)"
        @pointerdown="startColResize(i, $event)"
      />
    </template>

    <!-- Inner row resize handles (skip virtual + last visible) -->
    <template v-for="(r, i) in vmRows" :key="`r${i}`">
      <div
        v-if="showRowInnerHandle(i)"
        class="ei-cell-overlay__row-handle"
        :style="rowHandleStyle(r)"
        @pointerdown="startRowResize(r.index, $event)"
      />
    </template>

    <!-- Outer edge resize handles: table width / height -->
    <div
      class="ei-cell-overlay__outer-handle"
      :style="outerRightHandleStyle"
      @pointerdown="startOuterResize('w', $event)"
    />
    <div
      class="ei-cell-overlay__outer-handle"
      :style="outerBottomHandleStyle"
      @pointerdown="startOuterResize('h', $event)"
    />

    <!-- Current cell highlight -->
    <div
      class="ei-cell-overlay__highlight"
      :style="highlightStyle"
      @dblclick="onHighlightDblClick"
    />

    <!-- Inline text editor -->
    <input
      v-if="editing"
      ref="editRef"
      v-model="editBuffer"
      :style="editStyle"
      @blur="commitEditText"
      @keydown.enter.prevent="commitEditText"
      @keydown.esc.stop.prevent="cancelEditText"
    >

    <!-- repeat-template 角标（仅 table-data） -->
    <div
      v-if="repeatBadge"
      class="ei-cell-overlay__repeat-badge"
      :style="repeatBadgeStyle"
      :title="store.t('designer.table.repeatBadge') || '循环行：每行数据展开为 1 行'"
    >
      {{ store.t('designer.table.repeat') || '循环 N 行' }}
    </div>

    <!-- 列宽 / 行高实时 mm tooltip -->
    <div
      v-if="resizeTip"
      class="ei-cell-overlay__resize-tip"
      :style="{
        position: 'absolute',
        left: `${resizeTip.x + 8}px`,
        top: `${resizeTip.y - 24}px`,
        padding: '2px 6px',
        background: 'rgba(0,0,0,0.78)',
        color: '#fff',
        fontSize: '11px',
        borderRadius: '3px',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: '34',
      }"
    >
      {{ resizeTip.text }}
    </div>

    <!-- Floating icon toolbar -->
    <div class="ei-cell-overlay__toolbar" :style="toolbarStyle">
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.insertRowAbove')" @click="run('insertRowAbove', 'insert row above')" @pointerdown.stop>
        <IconTableInsertRowAbove :size="14" :stroke-width="1.5" />
      </button>
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.insertRowBelow')" @click="run('insertRowBelow', 'insert row below')" @pointerdown.stop>
        <IconTableInsertRowBelow :size="14" :stroke-width="1.5" />
      </button>
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.removeRow')" @click="run('removeRow', 'remove row')" @pointerdown.stop>
        <IconTableRemoveRow :size="14" :stroke-width="1.5" />
      </button>
      <span class="ei-cell-overlay__sep" />
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.insertColLeft')" @click="run('insertColLeft', 'insert col left')" @pointerdown.stop>
        <IconTableInsertColLeft :size="14" :stroke-width="1.5" />
      </button>
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.insertColRight')" @click="run('insertColRight', 'insert col right')" @pointerdown.stop>
        <IconTableInsertColRight :size="14" :stroke-width="1.5" />
      </button>
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.removeCol')" @click="run('removeCol', 'remove col')" @pointerdown.stop>
        <IconTableRemoveCol :size="14" :stroke-width="1.5" />
      </button>
      <span class="ei-cell-overlay__sep" />
      <button
        type="button"
        class="ei-cell-overlay__btn"
        :title="store.t('designer.table.mergeRight')"
        :disabled="!canMergeRight"
        @click="run('mergeCells', 'merge cells', { nodeId: node!.id, row: selection!.row, col: selection!.col, rowSpan: 1, colSpan: 2 })"
        @pointerdown.stop
      >
        <IconTableMerge :size="14" :stroke-width="1.5" />
      </button>
      <button
        type="button"
        class="ei-cell-overlay__btn"
        :title="store.t('designer.table.splitCell')"
        :disabled="!canSplit"
        @click="run('splitCell', 'split cell', { nodeId: node!.id, row: selection!.row, col: selection!.col })"
        @pointerdown.stop
      >
        <IconTableSplit :size="14" :stroke-width="1.5" />
      </button>
      <span class="ei-cell-overlay__sep" />
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.editText') || '编辑文本'" @click="beginEditText" @pointerdown.stop>
        <IconFilePen :size="14" :stroke-width="1.5" />
      </button>
      <button type="button" class="ei-cell-overlay__btn" :title="store.t('designer.table.clearText') || '清空'" @click="clearCellText" @pointerdown.stop>
        <IconDelete :size="14" :stroke-width="1.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-cell-overlay__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 3px;
  color: #333;
  cursor: pointer;
}
.ei-cell-overlay__btn:hover:not(:disabled) {
  background: #f0f7ff;
  color: #1677ff;
}
.ei-cell-overlay__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ei-cell-overlay__sep {
  display: inline-block;
  width: 1px;
  height: 14px;
  background: #e5e5e5;
  margin: 0 2px;
}
.ei-cell-overlay__col-handle:hover,
.ei-cell-overlay__row-handle:hover {
  background: rgba(22, 119, 255, 0.25);
}
.ei-cell-overlay__outer-handle:hover {
  background: rgba(22, 119, 255, 0.4);
}
</style>
