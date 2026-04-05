<script setup lang="ts">
import { ref } from 'vue'

export interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  data?: unknown
}

defineProps<{
  nodes: TreeNode[]
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [node: TreeNode]
}>()

const expandedIds = ref(new Set<string>())

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  }
  else {
    expandedIds.value.add(id)
  }
}

function isExpanded(id: string): boolean {
  return expandedIds.value.has(id)
}
</script>

<template>
  <div class="ei-tree">
    <template v-for="node in nodes" :key="node.id">
      <div
        class="ei-tree__node"
        :class="{ 'ei-tree__node--selected': node.id === selectedId }"
        @click="emit('select', node)"
      >
        <span
          v-if="node.children && node.children.length > 0"
          class="ei-tree__toggle"
          @click.stop="toggleExpand(node.id)"
        >
          {{ isExpanded(node.id) ? 'v' : '>' }}
        </span>
        <span v-else class="ei-tree__toggle ei-tree__toggle--leaf" />
        <span class="ei-tree__label">{{ node.label }}</span>
      </div>
      <div
        v-if="node.children && node.children.length > 0 && isExpanded(node.id)"
        class="ei-tree__children"
      >
        <EiTree
          :nodes="node.children"
          :selected-id="selectedId"
          @select="emit('select', $event)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.ei-tree {
  font-size: 13px;
}

.ei-tree__node {
  display: flex;
  align-items: center;
  padding: 2px 4px;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
}

.ei-tree__node:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-tree__node--selected {
  background: var(--ei-selected-bg, #e6f7ff);
  color: var(--ei-primary, #1890ff);
}

.ei-tree__toggle {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--ei-text-secondary, #999);
}

.ei-tree__toggle--leaf {
  visibility: hidden;
}

.ei-tree__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ei-tree__children {
  padding-left: 16px;
}
</style>
