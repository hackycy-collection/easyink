<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * EiPopover: lightweight anchor-positioned popover.
 *
 * Renders the trigger via the default slot and the floating panel via
 * the `content` slot. Positioning is `position: fixed` relative to the
 * trigger's bounding rect; click-outside (capturing phase) closes it.
 *
 * The panel is mounted inside the component (not teleported) — sufficient
 * for toolbar usage where the parent has no overflow:hidden traps.
 */

const props = withDefaults(
  defineProps<{
    open: boolean
    placement?: 'bottom-start' | 'bottom-end'
    offset?: number
  }>(),
  {
    placement: 'bottom-start',
    offset: 4,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

function compute() {
  const el = triggerRef.value
  if (!el)
    return
  const r = el.getBoundingClientRect()
  const top = r.bottom + props.offset
  const left = props.placement === 'bottom-end'
    ? r.right - (panelRef.value?.offsetWidth ?? 0)
    : r.left
  pos.value = { top, left }
}

function onDocPointerDown(ev: PointerEvent) {
  if (!props.open)
    return
  const target = ev.target as Node | null
  if (!target)
    return
  if (panelRef.value && panelRef.value.contains(target))
    return
  if (triggerRef.value && triggerRef.value.contains(target))
    return
  emit('update:open', false)
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      requestAnimationFrame(() => {
        compute()
      })
      window.addEventListener('pointerdown', onDocPointerDown, true)
      window.addEventListener('resize', compute)
      window.addEventListener('scroll', compute, true)
    }
    else {
      window.removeEventListener('pointerdown', onDocPointerDown, true)
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('resize', compute)
  window.removeEventListener('scroll', compute, true)
})

const panelStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`,
  zIndex: 9999,
}))
</script>

<template>
  <div ref="triggerRef" class="ei-popover-trigger">
    <slot />
    <div v-if="props.open" ref="panelRef" class="ei-popover-panel" :style="panelStyle">
      <slot name="content" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ei-popover-trigger {
  display: inline-flex;
  align-items: center;
}

.ei-popover-panel {
  background: var(--ei-bg-elevated, #fff);
  border: 1px solid var(--ei-border-color, #d9d9d9);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8px;
  min-width: 180px;
}
</style>
