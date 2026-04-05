<script setup lang="ts">
defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="ei-checkbox" :class="{ 'ei-checkbox--disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span v-if="label" class="ei-checkbox__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.ei-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ei-text, #333);
}

.ei-checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ei-checkbox__label {
  user-select: none;
}
</style>
