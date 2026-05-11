<script setup lang="ts">
import type { Component } from 'vue'
import {
  IconCheck,
  IconCircleAlert,
  IconCircleDot,
  IconFileCheck,
  IconFilePen,
  IconLoader,
  IconMessageSquare,
  IconMonitor,
  IconPanelLeft,
  IconSave,
  IconWifi,
  IconWifiOff,
} from '@easyink/icons'
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

const store = useDesignerStore()

const status = computed(() => store.workbench.status)

const focusIconMap: Record<string, Component> = {
  canvas: IconMonitor,
  panel: IconPanelLeft,
  dialog: IconMessageSquare,
  none: IconCircleDot,
}

const networkIconMap: Record<string, Component> = {
  idle: IconWifi,
  loading: IconLoader,
  error: IconWifiOff,
}

const draftIconMap: Record<string, Component> = {
  clean: IconFileCheck,
  modified: IconFilePen,
}

const savePhaseIconMap: Record<string, Component> = {
  idle: IconSave,
  queued: IconSave,
  saving: IconSave,
  success: IconCheck,
  failed: IconCircleAlert,
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function statusTitle(prefix: string, value: string): string {
  return store.t(`designer.status.${prefix}${capitalize(value)}`)
}
</script>

<template>
  <div class="ei-status-bar">
    <span
      class="ei-status-bar__item ei-status-bar__save"
      :class="{
        'ei-status-bar__save--queued': status.savePhase === 'queued',
        'ei-status-bar__save--saving': status.savePhase === 'saving',
        'ei-status-bar__save--success': status.savePhase === 'success',
        'ei-status-bar__save--failed': status.savePhase === 'failed',
      }"
      :title="status.saveMessage || statusTitle('savePhase', status.savePhase)"
    >
      <component
        :is="savePhaseIconMap[status.savePhase]"
        :size="12"
        :class="{
          'ei-status-bar__spin': status.savePhase === 'saving',
          'ei-status-bar__pulse': status.savePhase === 'success',
        }"
      />
    </span>
    <span
      class="ei-status-bar__item"
      :class="{ 'ei-status-bar__item--warning': status.draft === 'modified' }"
      :title="statusTitle('draft', status.draft)"
    >
      <component :is="draftIconMap[status.draft]" :size="12" />
    </span>
    <span
      class="ei-status-bar__item"
      :class="{ 'ei-status-bar__item--error': status.network === 'error' }"
      :title="statusTitle('network', status.network)"
    >
      <component
        :is="networkIconMap[status.network]"
        :size="12"
        :class="{ 'ei-status-bar__spin': status.network === 'loading' }"
      />
    </span>
    <span class="ei-status-bar__item" :title="statusTitle('focus', status.focus)">
      <component :is="focusIconMap[status.focus]" :size="12" />
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

<style scoped lang="scss">
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

  &__spacer {
    flex: 1;
  }

  &__item {
    display: flex;
    align-items: center;
    user-select: none;

    &--error {
      color: var(--ei-error, #ff4d4f);
    }

    &--warning {
      color: var(--ei-warning, #faad14);
    }

    &--success {
      color: var(--ei-success, #52c41a);
    }
  }

  &__save {
    width: 16px;
    justify-content: center;
    color: var(--ei-text-tertiary, #b0b0b0);

    &--queued {
      color: var(--ei-primary-soft, #4d8dff);
      animation: ei-status-save-queued 160ms ease-out;
    }

    &--saving {
      color: var(--ei-primary, #1677ff);
    }

    &--success {
      color: var(--ei-success, #52c41a);
    }

    &--failed {
      color: var(--ei-error, #ff4d4f);
    }
  }

  &__spin {
    animation: ei-spin 1s linear infinite;
  }

  &__pulse {
    animation: ei-status-save-pulse 240ms ease-out;
  }
}

@keyframes ei-status-save-queued {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

@keyframes ei-status-save-pulse {
  0% {
    opacity: 0.72;
    transform: scale(0.86);
  }
  70% {
    opacity: 1;
    transform: scale(1.16);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ei-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
