<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
  fonts?: Array<{ family: string, displayName: string }>
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const searchQuery = ref('')
const isOpen = ref(false)

const filteredFonts = computed(() => {
  if (!props.fonts || props.fonts.length === 0)
    return []
  if (!searchQuery.value)
    return props.fonts
  const q = searchQuery.value.toLowerCase()
  return props.fonts.filter(f =>
    f.displayName.toLowerCase().includes(q)
    || f.family.toLowerCase().includes(q),
  )
})

const displayValue = computed(() => {
  if (!props.modelValue)
    return ''
  const found = props.fonts?.find(f => f.family === props.modelValue)
  return found ? found.displayName : props.modelValue
})

function selectFont(family: string) {
  emit('update:modelValue', family)
  isOpen.value = false
  searchQuery.value = ''
}

function handleInputChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

watch(isOpen, (open) => {
  if (!open)
    searchQuery.value = ''
})
</script>

<template>
  <div class="ei-font-picker-wrapper">
    <label v-if="label" class="ei-font-picker__label">{{ label }}</label>
    <div class="ei-font-picker">
      <template v-if="fonts && fonts.length > 0">
        <button
          class="ei-font-picker__trigger"
          :disabled="disabled"
          @click="isOpen = !isOpen"
        >
          <span class="ei-font-picker__value">{{ displayValue || '--' }}</span>
          <span class="ei-font-picker__arrow">{{ isOpen ? '▲' : '▼' }}</span>
        </button>
        <div v-if="isOpen" class="ei-font-picker__dropdown">
          <input
            v-model="searchQuery"
            class="ei-font-picker__search"
            placeholder="..."
          >
          <ul class="ei-font-picker__list">
            <li
              v-for="f in filteredFonts"
              :key="f.family"
              class="ei-font-picker__item"
              :class="{ 'ei-font-picker__item--active': f.family === modelValue }"
              :style="{ fontFamily: f.family }"
              @click="selectFont(f.family)"
            >
              {{ f.displayName }}
            </li>
            <li v-if="filteredFonts.length === 0" class="ei-font-picker__empty">
              --
            </li>
          </ul>
        </div>
      </template>
      <input
        v-else
        class="ei-font-picker__fallback"
        :value="modelValue"
        :disabled="disabled"
        @change="handleInputChange"
      >
    </div>
  </div>
</template>

<style scoped>
.ei-font-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ei-font-picker__label {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
}

.ei-font-picker {
  position: relative;
}

.ei-font-picker__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  background: var(--ei-input-bg, #fff);
  color: var(--ei-text, #333);
  cursor: pointer;
  text-align: left;
}

.ei-font-picker__trigger:hover {
  border-color: var(--ei-primary, #1890ff);
}

.ei-font-picker__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ei-font-picker__arrow {
  font-size: 10px;
  color: var(--ei-text-secondary, #999);
}

.ei-font-picker__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 2px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--ei-panel-bg, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.ei-font-picker__search {
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-bottom: 1px solid var(--ei-border-color, #eee);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  background: transparent;
}

.ei-font-picker__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 200px;
  overflow-y: auto;
}

.ei-font-picker__item {
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
}

.ei-font-picker__item:hover {
  background: var(--ei-hover-bg, #f0f0f0);
}

.ei-font-picker__item--active {
  color: var(--ei-primary, #1890ff);
  font-weight: 500;
}

.ei-font-picker__empty {
  padding: 8px;
  font-size: 12px;
  color: var(--ei-text-secondary, #999);
  text-align: center;
}

.ei-font-picker__fallback {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: var(--ei-input-bg, #fff);
  color: var(--ei-text, #333);
  box-sizing: border-box;
}

.ei-font-picker__fallback:focus {
  border-color: var(--ei-primary, #1890ff);
}

.ei-font-picker__fallback:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
