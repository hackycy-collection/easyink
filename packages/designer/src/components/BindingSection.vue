<script setup lang="ts">
import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { BindingDisplayFormat, BindingFormatPresetType, BindingPresetFormat } from '@easyink/shared'
import { EiButton, EiInput, EiSelect, EiTextarea } from '@easyink/ui'
import { computed } from 'vue'

const props = defineProps<{
  element: MaterialNode
  t: (key: string) => string
  /** External binding override (from overlay). When provided, overrides element.binding. */
  externalBinding?: BindingRef | BindingRef[] | null
  /** Whether external binding is explicitly set (to distinguish undefined from not-provided) */
  hasExternalBinding?: boolean
}>()

const emit = defineEmits<{
  clearBinding: [nodeId: string]
  clearExternalBinding: [bindIndex?: number]
  updateBindingFormat: [format: BindingDisplayFormat | undefined, bindIndex?: number]
}>()

const modeOptions = [
  { label: '原始值', value: 'none' },
  { label: '预设格式', value: 'preset' },
  { label: '自定义函数', value: 'custom' },
]

const presetOptions: Array<{ label: string, value: BindingFormatPresetType }> = [
  { label: '日期时间', value: 'datetime' },
  { label: '星期', value: 'weekday' },
  { label: '中文金额大写', value: 'chinese-money' },
  { label: '数字', value: 'number' },
  { label: '货币', value: 'currency' },
  { label: '百分比', value: 'percent' },
]

const weekdayStyleOptions = [
  { label: '完整', value: 'long' },
  { label: '短', value: 'short' },
  { label: '窄', value: 'narrow' },
]

const bindings = computed<BindingRef[]>(() => {
  // When overlay provides binding context, use it
  if (props.hasExternalBinding) {
    if (props.externalBinding === null || props.externalBinding === undefined)
      return []
    return Array.isArray(props.externalBinding) ? props.externalBinding : [props.externalBinding]
  }
  // Default: element-level binding
  const b = props.element.binding
  if (!b)
    return []
  return Array.isArray(b) ? b : [b]
})

const isExternal = computed(() => props.hasExternalBinding && props.externalBinding !== null)

function handleClear() {
  if (isExternal.value) {
    emit('clearExternalBinding')
  }
  else {
    emit('clearBinding', props.element.id)
  }
}

function bindIndex(ref: BindingRef, index: number): number {
  return ref.bindIndex ?? index
}

function modeOf(ref: BindingRef): 'none' | 'preset' | 'custom' {
  if (ref.format?.mode === 'preset' || ref.format?.preset)
    return 'preset'
  if (ref.format?.mode === 'custom' || ref.format?.custom)
    return 'custom'
  return 'none'
}

function presetOf(ref: BindingRef): BindingPresetFormat {
  return ref.format?.preset ?? { type: 'datetime', pattern: 'yyyy-MM-dd HH:mm:ss' }
}

function updateFormat(ref: BindingRef, index: number, format: BindingDisplayFormat) {
  emit('updateBindingFormat', cleanFormat(format), bindIndex(ref, index))
}

function cloneFormat(ref: BindingRef): BindingDisplayFormat {
  return {
    ...ref.format,
    preset: ref.format?.preset ? { ...ref.format.preset } : undefined,
    custom: ref.format?.custom ? { ...ref.format.custom } : undefined,
  }
}

function cleanFormat(format: BindingDisplayFormat): BindingDisplayFormat | undefined {
  const next: BindingDisplayFormat = {}
  if (format.prefix)
    next.prefix = format.prefix
  if (format.suffix)
    next.suffix = format.suffix
  if (format.fallback)
    next.fallback = format.fallback
  if (format.mode === 'preset' && format.preset) {
    next.mode = 'preset'
    next.preset = cleanPreset(format.preset)
  }
  if (format.mode === 'custom' && format.custom?.source?.trim()) {
    next.mode = 'custom'
    next.custom = { source: format.custom.source }
  }
  return Object.keys(next).length > 0 ? next : undefined
}

function cleanPreset(preset: BindingPresetFormat): BindingPresetFormat {
  const next: BindingPresetFormat = { type: preset.type }
  if (preset.pattern)
    next.pattern = preset.pattern
  if (preset.locale)
    next.locale = preset.locale
  if (preset.timeZone)
    next.timeZone = preset.timeZone
  if (preset.weekdayStyle)
    next.weekdayStyle = preset.weekdayStyle
  if (typeof preset.minimumFractionDigits === 'number')
    next.minimumFractionDigits = preset.minimumFractionDigits
  if (typeof preset.maximumFractionDigits === 'number')
    next.maximumFractionDigits = preset.maximumFractionDigits
  if (preset.currency)
    next.currency = preset.currency
  return next
}

function updateTextField(ref: BindingRef, index: number, key: 'prefix' | 'suffix' | 'fallback', value: string | number) {
  const next = cloneFormat(ref)
  next[key] = String(value)
  updateFormat(ref, index, next)
}

function updateMode(ref: BindingRef, index: number, value: string | number) {
  const next = cloneFormat(ref)
  if (value === 'preset') {
    next.mode = 'preset'
    next.preset = next.preset ?? { type: 'datetime', pattern: 'yyyy-MM-dd HH:mm:ss' }
    next.custom = undefined
  }
  else if (value === 'custom') {
    next.mode = 'custom'
    next.custom = next.custom ?? { source: '(value) => String(value ?? \'\')' }
    next.preset = undefined
  }
  else {
    next.mode = undefined
    next.preset = undefined
    next.custom = undefined
  }
  updateFormat(ref, index, next)
}

function updatePreset(ref: BindingRef, index: number, patch: Partial<BindingPresetFormat>) {
  const next = cloneFormat(ref)
  next.mode = 'preset'
  next.preset = { ...presetOf(ref), ...patch }
  next.custom = undefined
  updateFormat(ref, index, next)
}

function updatePresetNumber(ref: BindingRef, index: number, key: 'minimumFractionDigits' | 'maximumFractionDigits', value: string | number) {
  const text = String(value).trim()
  updatePreset(ref, index, { [key]: text === '' ? undefined : Number(text) })
}

function updateCustomSource(ref: BindingRef, index: number, value: string) {
  const next = cloneFormat(ref)
  next.mode = 'custom'
  next.custom = { source: value }
  next.preset = undefined
  updateFormat(ref, index, next)
}
</script>

<template>
  <div class="ei-binding-section">
    <div class="ei-binding-section__header">
      <span class="ei-binding-section__title">{{ t('designer.property.dataBinding') }}</span>
    </div>
    <template v-if="bindings.length > 0">
      <div
        v-for="(ref, idx) in bindings"
        :key="idx"
        class="ei-binding-section__item"
      >
        <div class="ei-binding-section__row">
          <span class="ei-binding-section__label">{{ t('designer.dataSource.source') }}</span>
          <span class="ei-binding-section__value">{{ ref.sourceName || ref.sourceId }}</span>
        </div>
        <div class="ei-binding-section__row">
          <span class="ei-binding-section__label">{{ t('designer.dataSource.field') }}</span>
          <span class="ei-binding-section__value">{{ ref.fieldLabel || ref.fieldPath }}</span>
        </div>
        <div class="ei-binding-section__format">
          <div class="ei-binding-section__grid">
            <EiInput
              :model-value="ref.format?.prefix || ''"
              :label="t('designer.bindingFormat.prefix')"
              @commit="value => updateTextField(ref, idx, 'prefix', value)"
            />
            <EiInput
              :model-value="ref.format?.suffix || ''"
              :label="t('designer.bindingFormat.suffix')"
              @commit="value => updateTextField(ref, idx, 'suffix', value)"
            />
          </div>
          <EiInput
            :model-value="ref.format?.fallback || ''"
            :label="t('designer.bindingFormat.fallback')"
            @commit="value => updateTextField(ref, idx, 'fallback', value)"
          />
          <EiSelect
            :model-value="modeOf(ref)"
            :options="modeOptions"
            :label="t('designer.bindingFormat.mode')"
            @commit="value => updateMode(ref, idx, value)"
          />
          <template v-if="modeOf(ref) === 'preset'">
            <EiSelect
              :model-value="presetOf(ref).type"
              :options="presetOptions"
              :label="t('designer.bindingFormat.preset')"
              @commit="value => updatePreset(ref, idx, { type: value as BindingFormatPresetType })"
            />
            <template v-if="presetOf(ref).type === 'datetime'">
              <EiInput
                :model-value="presetOf(ref).pattern || 'yyyy-MM-dd HH:mm:ss'"
                :label="t('designer.bindingFormat.pattern')"
                @commit="value => updatePreset(ref, idx, { pattern: String(value) })"
              />
            </template>
            <template v-if="presetOf(ref).type === 'weekday'">
              <EiSelect
                :model-value="presetOf(ref).weekdayStyle || 'long'"
                :options="weekdayStyleOptions"
                :label="t('designer.bindingFormat.weekdayStyle')"
                @commit="value => updatePreset(ref, idx, { weekdayStyle: value as BindingPresetFormat['weekdayStyle'] })"
              />
            </template>
            <template v-if="['datetime', 'weekday', 'number', 'currency', 'percent'].includes(presetOf(ref).type)">
              <div class="ei-binding-section__grid">
                <EiInput
                  :model-value="presetOf(ref).locale || ''"
                  :label="t('designer.bindingFormat.locale')"
                  @commit="value => updatePreset(ref, idx, { locale: String(value) })"
                />
                <EiInput
                  v-if="presetOf(ref).type === 'datetime' || presetOf(ref).type === 'weekday'"
                  :model-value="presetOf(ref).timeZone || ''"
                  :label="t('designer.bindingFormat.timeZone')"
                  @commit="value => updatePreset(ref, idx, { timeZone: String(value) })"
                />
              </div>
            </template>
            <template v-if="['number', 'currency', 'percent'].includes(presetOf(ref).type)">
              <div class="ei-binding-section__grid">
                <EiInput
                  :model-value="presetOf(ref).minimumFractionDigits ?? ''"
                  type="number"
                  :label="t('designer.bindingFormat.minDigits')"
                  @commit="value => updatePresetNumber(ref, idx, 'minimumFractionDigits', value)"
                />
                <EiInput
                  :model-value="presetOf(ref).maximumFractionDigits ?? ''"
                  type="number"
                  :label="t('designer.bindingFormat.maxDigits')"
                  @commit="value => updatePresetNumber(ref, idx, 'maximumFractionDigits', value)"
                />
              </div>
              <EiInput
                v-if="presetOf(ref).type === 'currency'"
                :model-value="presetOf(ref).currency || 'CNY'"
                :label="t('designer.bindingFormat.currency')"
                @commit="value => updatePreset(ref, idx, { currency: String(value) })"
              />
            </template>
          </template>
          <EiTextarea
            v-if="modeOf(ref) === 'custom'"
            :model-value="ref.format?.custom?.source || '(value) => String(value ?? \'\')'"
            :label="t('designer.bindingFormat.customSource')"
            :rows="4"
            @commit="value => updateCustomSource(ref, idx, value)"
          />
        </div>
      </div>
      <div class="ei-binding-section__actions">
        <EiButton size="sm" @click="handleClear">
          {{ t('designer.dataSource.unbind') }}
        </EiButton>
      </div>
    </template>
    <div v-else class="ei-binding-section__empty">
      {{ t('designer.dataSource.dragHint') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.ei-binding-section {
  width: 100%;

  &__header {
    margin-bottom: 6px;
  }

  &__title {
    font-weight: 500;
    font-size: 12px;
    color: var(--ei-text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__item {
    padding: 6px;
    background: var(--ei-panel-header-bg, #fafafa);
    border: 1px solid var(--ei-border-color, #eee);
    border-radius: 4px;
    margin-bottom: 4px;
  }

  &__row {
    display: flex;
    gap: 8px;
    font-size: 12px;
    line-height: 1.6;
  }

  &__format {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--ei-border-color, #eee);
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }

  &__label {
    color: var(--ei-text-secondary, #999);
    flex-shrink: 0;
    min-width: 32px;
  }

  &__value {
    color: var(--ei-text, #333);
    word-break: break-all;
  }

  &__actions {
    margin-top: 4px;
  }

  &__empty {
    font-size: 12px;
    color: var(--ei-text-secondary, #999);
    padding: 4px 0;
  }
}
</style>
