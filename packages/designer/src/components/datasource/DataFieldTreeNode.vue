<script setup lang="ts">
import type { DataFieldNode, DataSourceDescriptor } from '@easyink/datasource'
import type { DatasourceFieldDragData } from '../../composables/use-datasource-drop'
import {
  IconChevronRight,
  IconFolderClosed,
  IconFolderOpen,
  IconGripVertical,
} from '@easyink/icons'
import { DATASOURCE_DRAG_MIME } from '../../composables/use-datasource-drop'

const props = defineProps<{
  field: DataFieldNode
  source: DataSourceDescriptor
  depth: number
  toggleExpand: (key: string) => void
  isExpanded: (key: string) => boolean
}>()

function nodeKey(): string {
  return `${props.source.id}:${props.field.path || props.field.name}`
}

function fieldPath(): string {
  return props.field.path || props.field.name
}

function isLeaf(): boolean {
  return !props.field.fields || props.field.fields.length === 0
}

function expanded(): boolean {
  return props.isExpanded(nodeKey())
}

function childKey(child: DataFieldNode): string {
  return `${props.source.id}:${child.path || child.name}`
}

function onToggle() {
  props.toggleExpand(nodeKey())
}

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer)
    return
  const data: DatasourceFieldDragData = {
    sourceId: props.source.id,
    sourceName: props.source.name,
    sourceTag: props.source.tag,
    fieldPath: props.field.path || props.field.name,
    fieldKey: props.field.key,
    fieldLabel: props.field.title || props.field.name,
    use: props.field.use,
  }
  e.dataTransfer.setData(DATASOURCE_DRAG_MIME, JSON.stringify(data))
  e.dataTransfer.effectAllowed = 'link'
}
</script>

<template>
  <!-- Group node (has children) -->
  <div v-if="!isLeaf()">
    <div
      class="ei-field-node__row ei-field-node__row--group"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
      @click="onToggle"
    >
      <IconChevronRight
        :size="14"
        :stroke-width="1.5"
        class="ei-field-node__chevron"
        :class="{ 'ei-field-node__chevron--expanded': expanded() }"
      />
      <component
        :is="expanded() ? IconFolderOpen : IconFolderClosed"
        :size="14"
        :stroke-width="1.5"
        class="ei-field-node__icon ei-field-node__icon--folder"
      />
      <span class="ei-field-node__label">{{ field.title || field.name }}</span>
    </div>
    <template v-if="expanded()">
      <DataFieldTreeNode
        v-for="child in field.fields"
        :key="childKey(child)"
        :field="child"
        :source="source"
        :depth="depth + 1"
        :toggle-expand="toggleExpand"
        :is-expanded="isExpanded"
      />
    </template>
  </div>

  <!-- Leaf node (draggable) -->
  <div
    v-else
    class="ei-field-node__row ei-field-node__row--leaf"
    :style="{ paddingLeft: `${depth * 16 + 4}px` }"
    draggable="true"
    @dragstart="onDragStart"
  >
    <span class="ei-field-node__chevron-spacer" />
    <IconGripVertical :size="12" :stroke-width="1.5" class="ei-field-node__grip" />
    <span class="ei-field-node__label" :title="fieldPath()">{{ field.title || field.name }}</span>
  </div>
</template>

<style scoped>
.ei-field-node__row {
  display: flex;
  align-items: center;
  padding: 3px 8px 3px 4px;
  border-radius: 3px;
  user-select: none;
  gap: 4px;
  min-height: 26px;
}

.ei-field-node__row--group {
  cursor: pointer;
}

.ei-field-node__row--group:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-field-node__row--leaf {
  cursor: grab;
}

.ei-field-node__row--leaf:active {
  cursor: grabbing;
}

.ei-field-node__row--leaf:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-field-node__row--leaf:hover .ei-field-node__path {
  opacity: 1;
}

.ei-field-node__chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: var(--ei-text-secondary, #999);
  transition: transform 0.15s ease;
}

.ei-field-node__chevron--expanded {
  transform: rotate(90deg);
}

.ei-field-node__chevron-spacer {
  flex-shrink: 0;
  width: 14px;
}

.ei-field-node__icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.ei-field-node__icon--folder {
  color: var(--ei-text-secondary, #999);
}

.ei-field-node__grip {
  flex-shrink: 0;
  color: var(--ei-text-secondary, #999);
}

.ei-field-node__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ei-text, #333);
  font-size: 12px;
}
</style>
