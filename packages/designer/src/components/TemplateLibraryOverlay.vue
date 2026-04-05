<script setup lang="ts">
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

const store = useDesignerStore()

const tpl = computed(() => store.workbench.templateLibrary)

function close() {
  store.workbench.templateLibrary.phase = 'closing'
  // allow transition then close
  store.workbench.templateLibrary.phase = 'closed'
}

function handleSearch() {
  if (tpl.value.backendMode === 'static-demo') {
    store.workbench.templateLibrary.phase = 'static-demo-warning'
  }
}

function handlePageChange(delta: number) {
  if (tpl.value.backendMode === 'static-demo') {
    store.workbench.templateLibrary.phase = 'static-demo-warning'
    return
  }
  store.workbench.templateLibrary.page += delta
}

function dismissWarning() {
  store.workbench.templateLibrary.phase = 'list-ready'
}
</script>

<template>
  <div class="ei-template-overlay">
    <div class="ei-template-overlay__header">
      <span class="ei-template-overlay__title">
        {{ store.t('designer.templateLibrary.title') }}
      </span>
      <input
        class="ei-template-overlay__search"
        :value="tpl.query"
        :placeholder="store.t('designer.templateLibrary.search')"
        @input="store.workbench.templateLibrary.query = ($event.target as HTMLInputElement).value"
        @keydown.enter="handleSearch"
      >
      <button class="ei-template-overlay__close" @click="close">
        x
      </button>
    </div>

    <div class="ei-template-overlay__body">
      <div v-if="tpl.phase === 'loading-list' || tpl.phase === 'opening'" class="ei-template-overlay__status">
        {{ store.t('designer.templateLibrary.loading') }}
      </div>

      <div v-else-if="tpl.phase === 'static-demo-warning'" class="ei-template-overlay__warning">
        <p>{{ store.t('designer.templateLibrary.staticDemoWarning') }}</p>
        <button class="ei-template-overlay__warning-btn" @click="dismissWarning">
          OK
        </button>
      </div>

      <div v-else-if="tpl.phase === 'loading-template'" class="ei-template-overlay__status">
        {{ store.t('designer.templateLibrary.loading') }}
      </div>

      <div v-else class="ei-template-overlay__grid">
        <div class="ei-template-overlay__empty">
          {{ store.t('designer.templateLibrary.empty') }}
        </div>
      </div>
    </div>

    <div class="ei-template-overlay__footer">
      <button class="ei-template-overlay__page-btn" :disabled="tpl.page <= 1" @click="handlePageChange(-1)">
        &lt;
      </button>
      <span class="ei-template-overlay__page-info">{{ tpl.page }}</span>
      <button class="ei-template-overlay__page-btn" @click="handlePageChange(1)">
        &gt;
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-template-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: var(--ei-panel-bg, #fff);
  display: flex;
  flex-direction: column;
}

.ei-template-overlay__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ei-border-color, #e0e0e0);
}

.ei-template-overlay__title {
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.ei-template-overlay__search {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.ei-template-overlay__search:focus {
  border-color: var(--ei-primary, #1890ff);
}

.ei-template-overlay__close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--ei-text-secondary, #999);
  flex-shrink: 0;
}

.ei-template-overlay__close:hover {
  background: var(--ei-hover-bg, #f0f0f0);
  color: var(--ei-text, #333);
}

.ei-template-overlay__body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.ei-template-overlay__status {
  text-align: center;
  padding: 40px;
  color: var(--ei-text-secondary, #999);
  font-size: 14px;
}

.ei-template-overlay__warning {
  text-align: center;
  padding: 40px;
  color: var(--ei-text-secondary, #666);
}

.ei-template-overlay__warning p {
  margin-bottom: 12px;
}

.ei-template-overlay__warning-btn {
  padding: 6px 20px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--ei-primary, #1890ff);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.ei-template-overlay__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.ei-template-overlay__empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: var(--ei-text-secondary, #999);
  font-size: 14px;
}

.ei-template-overlay__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--ei-border-color, #e0e0e0);
}

.ei-template-overlay__page-btn {
  padding: 4px 10px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}

.ei-template-overlay__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ei-template-overlay__page-info {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
  min-width: 24px;
  text-align: center;
}
</style>
