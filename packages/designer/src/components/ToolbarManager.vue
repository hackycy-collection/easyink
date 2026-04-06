<script setup lang="ts">
import {
  IconAlignStart,
  IconAlignCenterH,
  IconAlignEnd,
  IconBug,
  IconDatabase,
  IconHistory,
  IconListTree,
  IconMap,
  IconPanelMaterials,
  IconRestoreDefault,
  IconSliders,
} from '@easyink/icons'
import type { Component } from 'vue'
import { useDesignerStore } from '../composables'
import { createDefaultWorkbenchState } from '../store/workbench'

const store = useDesignerStore()
const toolbar = store.workbench.toolbar

// ─── Window Toggle Definitions ─────────────────────────────────

interface WindowToggle {
  kind: string
  labelKey: string
  icon: Component
}

const windowToggles: WindowToggle[] = [
  { kind: 'materials', labelKey: 'designer.panel.materials', icon: IconPanelMaterials },
  { kind: 'datasource', labelKey: 'designer.panel.datasource', icon: IconDatabase },
  { kind: 'properties', labelKey: 'designer.panel.properties', icon: IconSliders },
  { kind: 'structure-tree', labelKey: 'designer.panel.structureTree', icon: IconListTree },
  { kind: 'history', labelKey: 'designer.panel.history', icon: IconHistory },
  { kind: 'minimap', labelKey: 'designer.panel.minimap', icon: IconMap },
  { kind: 'debug', labelKey: 'designer.panel.debug', icon: IconBug },
]

function isWindowVisible(kind: string): boolean {
  const win = store.workbench.windows.find(w => w.kind === kind)
  return win ? win.visible : false
}

function toggleWindow(kind: string) {
  const win = store.workbench.windows.find(w => w.kind === kind)
  if (win) win.visible = !win.visible
}

// ─── Toolbar Align / Groups ────────────────────────────────────

function setAlign(align: 'start' | 'center' | 'end') {
  toolbar.align = align
}

function toggleGroup(id: string) {
  const group = toolbar.groups.find(g => g.id === id)
  if (group) group.hidden = !group.hidden
}

function toggleDivider(id: string) {
  const group = toolbar.groups.find(g => g.id === id)
  if (group) group.hideDivider = !group.hideDivider
}

function restoreDefault() {
  const defaults = createDefaultWorkbenchState().toolbar
  toolbar.align = defaults.align
  toolbar.groups.splice(0, toolbar.groups.length, ...defaults.groups)
}

function groupLabel(id: string): string {
  return store.t(`designer.toolbar.${groupLabelKey(id)}`)
}

function groupLabelKey(id: string): string {
  const map: Record<string, string> = {
    'undo-redo': 'undo',
    'new-clear': 'newTemplate',
    'font': 'bold',
    'rotation': 'rotation',
    'visibility': 'snapToGrid',
    'select': 'selectAll',
    'distribute': 'distribute',
    'align': 'alignLeft',
    'layer': 'layerUp',
    'group': 'group',
    'lock': 'lock',
    'clipboard': 'copy',
    'snap': 'snapToGrid',
  }
  return map[id] || id
}
</script>

<template>
  <div class="ei-toolbar-manager">
    <!-- Floating window toggles -->
    <div class="ei-toolbar-manager__section">
      <span class="ei-toolbar-manager__label">{{ store.t('designer.toolbar.windowToggles') }}</span>
    </div>
    <div class="ei-toolbar-manager__window-toggles">
      <button
        v-for="wt in windowToggles"
        :key="wt.kind"
        class="ei-toolbar-manager__window-btn"
        :class="{ 'ei-toolbar-manager__window-btn--active': isWindowVisible(wt.kind) }"
        :title="store.t(wt.labelKey)"
        @click="toggleWindow(wt.kind)"
      >
        <component :is="wt.icon" :size="16" :stroke-width="1.5" />
      </button>
    </div>

    <!-- Toolbar alignment -->
    <div class="ei-toolbar-manager__section">
      <span class="ei-toolbar-manager__label">{{ store.t('designer.toolbar.alignLeft') }}</span>
      <div class="ei-toolbar-manager__align-group">
        <button
          class="ei-toolbar-manager__align-btn"
          :class="{ 'ei-toolbar-manager__align--active': toolbar.align === 'start' }"
          :title="store.t('designer.toolbar.alignLeft')"
          @click="setAlign('start')"
        >
          <IconAlignStart :size="14" :stroke-width="1.5" />
        </button>
        <button
          class="ei-toolbar-manager__align-btn"
          :class="{ 'ei-toolbar-manager__align--active': toolbar.align === 'center' }"
          :title="store.t('designer.toolbar.alignCenter')"
          @click="setAlign('center')"
        >
          <IconAlignCenterH :size="14" :stroke-width="1.5" />
        </button>
        <button
          class="ei-toolbar-manager__align-btn"
          :class="{ 'ei-toolbar-manager__align--active': toolbar.align === 'end' }"
          :title="store.t('designer.toolbar.alignRight')"
          @click="setAlign('end')"
        >
          <IconAlignEnd :size="14" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <!-- Toolbar groups -->
    <div class="ei-toolbar-manager__list">
      <div
        v-for="group in toolbar.groups"
        :key="group.id"
        class="ei-toolbar-manager__item"
      >
        <label class="ei-toolbar-manager__checkbox">
          <input
            type="checkbox"
            :checked="!group.hidden"
            @change="toggleGroup(group.id)"
          >
          {{ groupLabel(group.id) }}
        </label>
        <label class="ei-toolbar-manager__checkbox ei-toolbar-manager__checkbox--secondary">
          <input
            type="checkbox"
            :checked="!group.hideDivider"
            @change="toggleDivider(group.id)"
          >
          |
        </label>
      </div>
    </div>

    <div class="ei-toolbar-manager__footer">
      <button class="ei-toolbar-manager__restore" @click="restoreDefault">
        <IconRestoreDefault :size="14" :stroke-width="1.5" />
        <span>{{ store.t('designer.toolbar.restoreDefault') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-toolbar-manager {
  font-size: 12px;
}

.ei-toolbar-manager__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--ei-border-color, #eee);
}

.ei-toolbar-manager__label {
  color: var(--ei-text-secondary, #666);
}

.ei-toolbar-manager__window-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--ei-border-color, #eee);
}

.ei-toolbar-manager__window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--ei-text-secondary, #999);
}

.ei-toolbar-manager__window-btn:hover {
  background: var(--ei-hover-bg, #f0f0f0);
  color: var(--ei-text, #333);
}

.ei-toolbar-manager__window-btn--active {
  background: var(--ei-primary, #1890ff);
  color: #fff;
  border-color: var(--ei-primary, #1890ff);
}

.ei-toolbar-manager__window-btn--active:hover {
  background: var(--ei-primary, #1890ff);
  color: #fff;
}

.ei-toolbar-manager__align-group {
  display: flex;
  gap: 2px;
}

.ei-toolbar-manager__align-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  color: var(--ei-text, #333);
}

.ei-toolbar-manager__align--active {
  background: var(--ei-primary, #1890ff) !important;
  color: #fff;
  border-color: var(--ei-primary, #1890ff) !important;
}

.ei-toolbar-manager__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.ei-toolbar-manager__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 10px;
}

.ei-toolbar-manager__checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.ei-toolbar-manager__checkbox--secondary {
  color: var(--ei-text-secondary, #999);
  font-size: 11px;
}

.ei-toolbar-manager__footer {
  padding: 6px 10px;
  border-top: 1px solid var(--ei-border-color, #eee);
}

.ei-toolbar-manager__restore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 4px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--ei-text, #333);
}

.ei-toolbar-manager__restore:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}
</style>
