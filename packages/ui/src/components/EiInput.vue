<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue?: string | number
  type?: 'text' | 'number'
  placeholder?: string
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'commit': [value: string | number]
}>()

const snapshotValue = ref<string | number | undefined>()

function onFocus() {
  snapshotValue.value = props.modelValue
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function onCommit(event: Event) {
  const current = (event.target as HTMLInputElement).value
  if (current !== snapshotValue.value) {
    emit('commit', current)
  }
  snapshotValue.value = current
}
</script>

<template>
  <div class="ei-input-wrapper">
    <label v-if="label" class="ei-input__label">{{ label }}</label>
    <input
      class="ei-input"
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @focus="onFocus"
      @input="onInput"
      @blur="onCommit"
      @keydown.enter="onCommit"
    >
  </div>
</template>

<style scoped lang="scss">
.ei-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ei-input {
  padding: 4px 8px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: var(--ei-input-bg, #fff);
  color: var(--ei-text, #333);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;

  &__label {
    font-size: 12px;
    color: var(--ei-text-secondary, #666);
  }

  &:focus {
    border-color: var(--ei-primary, #1890ff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
