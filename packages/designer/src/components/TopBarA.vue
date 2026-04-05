<script setup lang="ts">
import type { MaterialCatalogEntry } from '../types'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

const store = useDesignerStore()

const quickMaterials = computed<MaterialCatalogEntry[]>(() => store.getQuickMaterials())

const groupedCategories = computed(() => {
  const groups = ['data', 'chart', 'svg', 'relation'] as const
  return groups.map(group => ({
    group,
    label: store.t(`designer.toolbar.${group}`),
    items: store.getGroupedMaterials(group),
  })).filter(g => g.items.length > 0)
})

function handleAddMaterial(entry: MaterialCatalogEntry) {
  const definition = store.getMaterial(entry.materialType)
  if (!definition) return
  const node = definition.createDefaultNode({
    x: 50,
    y: 50,
  })
  store.addElement(node)
  store.selection.select(node.id)
}

function openTemplateLibrary() {
  store.workbench.templateLibrary.phase = 'opening'
}
</script>

<template>
  <div class="ei-topbar-a">
    <div class="ei-topbar-a__logo">
      EasyInk
    </div>

    <div class="ei-topbar-a__quick-materials">
      <button
        v-for="mat in quickMaterials"
        :key="mat.id"
        class="ei-topbar-a__material-btn"
        :title="mat.label"
        @click="handleAddMaterial(mat)"
      >
        {{ mat.label }}
      </button>
    </div>

    <div class="ei-topbar-a__grouped-materials">
      <div
        v-for="group in groupedCategories"
        :key="group.group"
        class="ei-topbar-a__group"
      >
        <button class="ei-topbar-a__group-btn">
          {{ group.label }}
        </button>
      </div>
    </div>

    <div class="ei-topbar-a__actions">
      <button class="ei-topbar-a__action" @click="openTemplateLibrary">
        {{ store.t('designer.templateLibrary.title') }}
      </button>
      <button class="ei-topbar-a__action" @click="store.workbench.preview.visible = true">
        {{ store.t('designer.toolbar.preview') }}
      </button>
      <button class="ei-topbar-a__action">
        {{ store.t('designer.toolbar.save') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-topbar-a {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ei-border-color, #e0e0e0);
  background: var(--ei-topbar-bg, #fff);
  gap: 8px;
}

.ei-topbar-a__logo {
  font-weight: 700;
  font-size: 16px;
  color: var(--ei-primary, #1890ff);
  margin-right: 12px;
  user-select: none;
}

.ei-topbar-a__quick-materials {
  display: flex;
  gap: 2px;
}

.ei-topbar-a__material-btn,
.ei-topbar-a__group-btn,
.ei-topbar-a__action {
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--ei-text, #333);
  white-space: nowrap;
}

.ei-topbar-a__material-btn:hover,
.ei-topbar-a__group-btn:hover,
.ei-topbar-a__action:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-topbar-a__grouped-materials {
  display: flex;
  gap: 2px;
}

.ei-topbar-a__actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
</style>
