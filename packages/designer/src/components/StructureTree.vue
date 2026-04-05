<script setup lang="ts">
import type { MaterialNode } from '@easyink/schema'
import { EiTree } from '@easyink/ui'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  data?: unknown
}

const store = useDesignerStore()

function toTreeNode(node: MaterialNode): TreeNode {
  return {
    id: node.id,
    label: node.name || `${node.type} (${node.id.slice(0, 8)})`,
    icon: node.type,
    children: node.children?.map(toTreeNode),
    data: node,
  }
}

const treeNodes = computed<TreeNode[]>(() => {
  return [
    {
      id: '__page_root__',
      label: store.t('designer.page.title'),
      icon: 'page',
      children: store.getElements().map(toTreeNode),
    },
  ]
})

const selectedId = computed(() => {
  const ids = store.selection.ids
  return ids.length === 1 ? ids[0] : undefined
})

function handleSelect(node: TreeNode) {
  if (node.id === '__page_root__') {
    store.selection.clear()
    return
  }
  store.selection.select(node.id)
}
</script>

<template>
  <EiTree
    :nodes="treeNodes"
    :selected-id="selectedId"
    @select="handleSelect"
  />
</template>
