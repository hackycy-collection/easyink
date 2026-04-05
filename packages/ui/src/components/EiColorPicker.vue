<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="ei-color-picker-wrapper">
    <label v-if="label" class="ei-color-picker__label">{{ label }}</label>
    <div class="ei-color-picker">
      <input
        type="color"
        class="ei-color-picker__input"
        :value="modelValue ?? '#000000'"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <span class="ei-color-picker__value">{{ modelValue ?? '#000000' }}</span>
    </div>
  </div>
</template>

<style scoped>
.ei-color-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ei-color-picker__label {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
}

.ei-color-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ei-color-picker__input {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  cursor: pointer;
}

.ei-color-picker__value {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
  font-family: monospace;
}
</style>
