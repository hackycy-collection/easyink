<script setup lang="ts">
import type { MaterialNode } from '@easyink/schema'
import type { TreeNode } from '@easyink/ui'
import { UpdateMaterialMetaCommand } from '@easyink/core'
import { IconHidden, IconLock } from '@easyink/icons'
import { EiIcon, EiTree } from '@easyink/ui'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'
import { selectOne } from '../interactions/selection-api'

const store = useDesignerStore()

function getNodeLabel(node: MaterialNode): string {
  if (node.name)
    return node.name
  const def = store.getMaterial(node.type)
  if (def)
    return store.t(def.name)
  return `${node.type} (${node.id.slice(0, 8)})`
}

function toTreeNode(node: MaterialNode): TreeNode {
  const definition = store.getMaterial(node.type)
  return {
    id: node.id,
    label: getNodeLabel(node),
    icon: definition?.icon,
    children: node.children?.map(toTreeNode),
    data: node,
  }
}

const treeNodes = computed<TreeNode[]>(() => {
  return store.getElements().map(toTreeNode)
})

const selectedId = computed(() => {
  const ids = store.selection.ids
  return ids.length === 1 ? ids[0] : undefined
})

function handleSelect(node: TreeNode) {
  selectOne(store, node.id)
}

function updateNodeMeta(node: MaterialNode, updates: Partial<Record<'hidden' | 'locked', boolean | undefined>>) {
  store.commands.execute(new UpdateMaterialMetaCommand(store.schema.elements, node.id, updates))
}

function handleUnlock(node: MaterialNode) {
  updateNodeMeta(node, { locked: false })
}

function handleShow(node: MaterialNode) {
  if (node.locked)
    return
  updateNodeMeta(node, { hidden: false })
}
</script>

<template>
  <EiTree
    :nodes="treeNodes"
    :selected-id="selectedId"
    default-expand-all
    @select="handleSelect"
  >
    <template #suffix="{ node }">
      <EiIcon
        v-if="(node.data as MaterialNode)?.locked"
        :icon="IconLock"
        :size="12"
        :stroke-width="1.5"
        class="structure-tree__status structure-tree__status--action"
        @click.stop="handleUnlock(node.data as MaterialNode)"
      />
      <EiIcon
        v-if="(node.data as MaterialNode)?.hidden"
        :icon="IconHidden"
        :size="12"
        :stroke-width="1.5"
        class="structure-tree__status"
        :class="{ 'structure-tree__status--action': !(node.data as MaterialNode)?.locked }"
        @click.stop="handleShow(node.data as MaterialNode)"
      />
    </template>
  </EiTree>
</template>

<style scoped lang="scss">
.structure-tree__status {
  color: var(--ei-text-secondary, #999);

  &--action {
    cursor: pointer;

    &:hover {
      color: var(--ei-primary, #1890ff);
    }
  }
}
</style>
