<script setup lang="ts">
import { computed } from 'vue'
import { useDesignerStore } from '../composables'

const store = useDesignerStore()

const selectedElements = computed(() => {
  const ids = store.selection.ids
  return ids.map(id => store.getElementById(id)).filter(Boolean)
})

const selectedElement = computed(() =>
  selectedElements.value.length === 1 ? selectedElements.value[0] : undefined,
)

const page = computed(() => store.schema.page)

function updateGeometry(key: string, value: number) {
  if (!selectedElement.value) return
  store.updateElement(selectedElement.value.id, { [key]: value })
}

function updatePage(key: string, value: unknown) {
  Object.assign(store.schema.page, { [key]: value })
}
</script>

<template>
  <div class="ei-properties-panel">
    <!-- Element properties: only when a single element is selected -->
    <template v-if="selectedElement">
      <div class="ei-properties-panel__section">
        <div class="ei-properties-panel__section-title">
          {{ store.t('designer.property.position') }} / {{ store.t('designer.property.size') }}
        </div>
        <div class="ei-properties-panel__grid">
          <label>X</label>
          <input
            type="number"
            :value="selectedElement.x"
            @change="updateGeometry('x', Number(($event.target as HTMLInputElement).value))"
          >
          <label>Y</label>
          <input
            type="number"
            :value="selectedElement.y"
            @change="updateGeometry('y', Number(($event.target as HTMLInputElement).value))"
          >
          <label>W</label>
          <input
            type="number"
            :value="selectedElement.width"
            @change="updateGeometry('width', Number(($event.target as HTMLInputElement).value))"
          >
          <label>H</label>
          <input
            type="number"
            :value="selectedElement.height"
            @change="updateGeometry('height', Number(($event.target as HTMLInputElement).value))"
          >
        </div>
      </div>

      <div class="ei-properties-panel__section">
        <div class="ei-properties-panel__section-title">
          {{ store.t('designer.property.rotation') }} / {{ store.t('designer.property.opacity') }}
        </div>
        <div class="ei-properties-panel__grid">
          <label>{{ store.t('designer.property.rotation') }}</label>
          <input
            type="number"
            :value="selectedElement.rotation ?? 0"
            @change="updateGeometry('rotation', Number(($event.target as HTMLInputElement).value))"
          >
          <label>{{ store.t('designer.property.opacity') }}</label>
          <input
            type="number"
            :value="selectedElement.alpha ?? 1"
            min="0"
            max="1"
            step="0.1"
            @change="updateGeometry('alpha', Number(($event.target as HTMLInputElement).value))"
          >
        </div>
      </div>

      <div class="ei-properties-panel__section">
        <div class="ei-properties-panel__section-title">
          {{ store.t('designer.property.style') }}
        </div>
        <div class="ei-properties-panel__fields">
          <label>
            <input
              type="checkbox"
              :checked="selectedElement.hidden"
              @change="store.updateElement(selectedElement!.id, { hidden: ($event.target as HTMLInputElement).checked })"
            >
            {{ store.t('designer.property.hidden') }}
          </label>
          <label>
            <input
              type="checkbox"
              :checked="selectedElement.locked"
              @change="store.updateElement(selectedElement!.id, { locked: ($event.target as HTMLInputElement).checked })"
            >
            {{ store.t('designer.property.locked') }}
          </label>
        </div>
      </div>
    </template>

    <!-- Page properties: always visible -->
    <div class="ei-properties-panel__section">
      <div class="ei-properties-panel__section-title">
        {{ store.t('designer.page.title') }}
      </div>
      <div class="ei-properties-panel__grid">
        <label>{{ store.t('designer.page.width') }}</label>
        <input
          type="number"
          :value="page.width"
          @change="updatePage('width', Number(($event.target as HTMLInputElement).value))"
        >
        <label>{{ store.t('designer.page.height') }}</label>
        <input
          type="number"
          :value="page.height"
          @change="updatePage('height', Number(($event.target as HTMLInputElement).value))"
        >
        <label>{{ store.t('designer.page.mode') }}</label>
        <select
          :value="page.mode"
          @change="updatePage('mode', ($event.target as HTMLSelectElement).value)"
        >
          <option value="fixed">
            {{ store.t('designer.page.fixed') }}
          </option>
          <option value="stack">
            {{ store.t('designer.page.stack') }}
          </option>
          <option value="label">
            {{ store.t('designer.page.label') }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ei-properties-panel {
  width: 100%;
  font-size: 13px;
}

.ei-properties-panel__section {
  padding: 8px 0;
  border-bottom: 1px solid var(--ei-border-color, #eee);
}

.ei-properties-panel__section-title {
  font-weight: 500;
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ei-properties-panel__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
  align-items: center;
}

.ei-properties-panel__grid label {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
}

.ei-properties-panel__grid input,
.ei-properties-panel__grid select {
  padding: 3px 6px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.ei-properties-panel__grid input:focus,
.ei-properties-panel__grid select:focus {
  border-color: var(--ei-primary, #1890ff);
}

.ei-properties-panel__fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ei-properties-panel__fields label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}
</style>
