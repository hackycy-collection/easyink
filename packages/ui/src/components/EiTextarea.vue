<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  label?: string
  rows?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'commit': [value: string]
}>()

const snapshotValue = ref<string | undefined>()

function onFocus() {
  snapshotValue.value = props.modelValue
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function onCommit(event: Event) {
  const current = (event.target as HTMLTextAreaElement).value
  if (current !== snapshotValue.value) {
    emit('commit', current)
  }
  snapshotValue.value = current
}
</script>

<template>
  <div class="ei-textarea-wrapper">
    <label v-if="label" class="ei-textarea__label">{{ label }}</label>
    <textarea
      class="ei-textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows ?? 3"
      @focus="onFocus"
      @input="onInput"
      @blur="onCommit"
    />
  </div>
</template>

<style scoped lang="scss">
.ei-textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ei-textarea {
  padding: 4px 8px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: var(--ei-input-bg, #fff);
  color: var(--ei-text, #333);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  line-height: 1.4;

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
