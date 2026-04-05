<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  options: Array<{ label: string; value: string | number }>
  placeholder?: string
  disabled?: boolean
  label?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

<template>
  <div class="ei-select-wrapper">
    <label v-if="label" class="ei-select__label">{{ label }}</label>
    <select
      class="ei-select"
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option
        v-for="opt in options"
        :key="String(opt.value)"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.ei-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ei-select__label {
  font-size: 12px;
  color: var(--ei-text-secondary, #666);
}

.ei-select {
  padding: 4px 8px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: var(--ei-input-bg, #fff);
  color: var(--ei-text, #333);
}

.ei-select:focus {
  border-color: var(--ei-primary, #1890ff);
}

.ei-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
