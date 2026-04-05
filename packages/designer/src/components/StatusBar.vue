<script setup lang="ts">
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

const store = useDesignerStore()

const status = computed(() => store.workbench.status)

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function statusText(prefix: string, value: string): string {
  return store.t(`designer.status.${prefix}${capitalize(value)}`)
}
</script>

<template>
  <div class="ei-status-bar">
    <span class="ei-status-bar__item">
      {{ statusText('focus', status.focus) }}
    </span>
    <span
      class="ei-status-bar__item"
      :class="{ 'ei-status-bar__item--error': status.network === 'error' }"
    >
      {{ statusText('network', status.network) }}
    </span>
    <span
      class="ei-status-bar__item"
      :class="{ 'ei-status-bar__item--warning': status.draft === 'modified' }"
    >
      {{ statusText('draft', status.draft) }}
    </span>
    <span
      v-if="status.autoSave !== 'idle'"
      class="ei-status-bar__item"
      :class="{
        'ei-status-bar__item--success': status.autoSave === 'success',
        'ei-status-bar__item--error': status.autoSave === 'failed',
      }"
    >
      {{ status.autoSaveMessage || statusText('autoSave', status.autoSave) }}
    </span>
    <span class="ei-status-bar__spacer" />
    <span class="ei-status-bar__item">
      {{ store.schema.unit }}
    </span>
    <span class="ei-status-bar__item">
      {{ store.schema.page.width }} x {{ store.schema.page.height }}
    </span>
    <span class="ei-status-bar__item">
      {{ Math.round(store.workbench.viewport.zoom * 100) }}%
    </span>
  </div>
</template>

<style scoped>
.ei-status-bar {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  border-top: 1px solid var(--ei-border-color, #e0e0e0);
  background: var(--ei-statusbar-bg, #f5f5f5);
  font-size: 11px;
  color: var(--ei-text-secondary, #999);
  gap: 12px;
  flex-shrink: 0;
}

.ei-status-bar__spacer {
  flex: 1;
}

.ei-status-bar__item {
  user-select: none;
}

.ei-status-bar__item--error {
  color: var(--ei-error, #ff4d4f);
}

.ei-status-bar__item--warning {
  color: var(--ei-warning, #faad14);
}

.ei-status-bar__item--success {
  color: var(--ei-success, #52c41a);
}
</style>
