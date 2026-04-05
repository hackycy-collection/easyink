<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  type?: 'text' | 'number'
  placeholder?: string
  disabled?: boolean
  label?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()
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
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<style scoped>
.ei-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ei-input__label {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
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
}

.ei-input:focus {
  border-color: var(--ei-primary, #1890ff);
}

.ei-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
