<script setup lang="ts">
import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { BindingDisplayFormat, BindingFormatPresetType, BindingPresetFormat } from '@easyink/shared'
import { IconCheck } from '@easyink/icons'
import { EiButton, EiDialog, EiIcon, EiInput } from '@easyink/ui'
import { computed, defineAsyncComponent, ref } from 'vue'

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

type BindingMode = 'none' | 'preset' | 'custom'
type FormatTab = 'preset' | 'custom'

const BindingCodeEditor = defineAsyncComponent(() => import('./BindingCodeEditor.vue'))

const modeOptions: Array<{ label: string, value: FormatTab }> = [
  { label: '预设', value: 'preset' },
  { label: '自定义', value: 'custom' },
]

const presetOptions: Array<{ label: string, value: BindingFormatPresetType }> = [
  { label: '日期时间', value: 'datetime' },
  { label: '星期', value: 'weekday' },
  { label: '中文金额大写', value: 'chinese-money' },
  { label: '数字', value: 'number' },
  { label: '货币', value: 'currency' },
  { label: '百分比', value: 'percent' },
]

interface PresetChoice {
  id: string
  label: string
  hint?: string
  preset?: BindingPresetFormat
}

const presetGroups: Array<{ label: string, choices: PresetChoice[] }> = [
  {
    label: '通用',
    choices: [
      { id: 'raw', label: '原始值', hint: '不转换字段值' },
    ],
  },
  {
    label: '日期时间',
    choices: [
      { id: 'date-dash', label: '2026-05-04', hint: '日期', preset: { type: 'datetime', pattern: 'yyyy-MM-dd' } },
      { id: 'date-slash', label: '2026/05/04', hint: '日期', preset: { type: 'datetime', pattern: 'yyyy/MM/dd' } },
      { id: 'datetime-minute', label: '2026-05-04 09:30', hint: '日期时间', preset: { type: 'datetime', pattern: 'yyyy-MM-dd HH:mm' } },
      { id: 'datetime-second', label: '2026-05-04 09:30:00', hint: '精确到秒', preset: { type: 'datetime', pattern: 'yyyy-MM-dd HH:mm:ss' } },
      { id: 'time-minute', label: '09:30', hint: '时间', preset: { type: 'datetime', pattern: 'HH:mm' } },
      { id: 'weekday-long', label: '星期一', hint: '星期', preset: { type: 'weekday', weekdayStyle: 'long' } },
    ],
  },
  {
    label: '数值金额',
    choices: [
      { id: 'number-integer', label: '1,235', hint: '整数', preset: { type: 'number', maximumFractionDigits: 0 } },
      { id: 'number-decimal2', label: '1,234.50', hint: '两位小数', preset: { type: 'number', minimumFractionDigits: 2, maximumFractionDigits: 2 } },
      { id: 'currency-cny', label: '¥1,234.50', hint: '人民币金额', preset: { type: 'currency', currency: 'CNY', minimumFractionDigits: 2, maximumFractionDigits: 2 } },
      { id: 'chinese-money', label: '壹仟贰佰叁拾肆元伍角', hint: '中文大写金额', preset: { type: 'chinese-money' } },
      { id: 'percent-integer', label: '13%', hint: '百分比', preset: { type: 'percent', maximumFractionDigits: 0 } },
      { id: 'percent-decimal2', label: '12.50%', hint: '百分比两位', preset: { type: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 } },
    ],
  },
]

const presetChoices = presetGroups.flatMap(group => group.choices)

const formatDialogOpen = ref(false)
const activeBindingIndex = ref<number | null>(null)
const activeTab = ref<FormatTab>('preset')
const draftFormat = ref<BindingDisplayFormat>({})

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

function modeOf(ref: BindingRef): BindingMode {
  return modeOfFormat(ref.format)
}

function modeOfFormat(format: BindingDisplayFormat | undefined): BindingMode {
  if (format?.mode === 'preset' || format?.preset)
    return 'preset'
  if (format?.mode === 'custom' || format?.custom)
    return 'custom'
  return 'none'
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
  const isCustom = format.mode === 'custom'
  if (!isCustom && format.prefix)
    next.prefix = format.prefix
  if (!isCustom && format.suffix)
    next.suffix = format.suffix
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

function updateDraftTextField(key: 'prefix' | 'suffix', value: string | number) {
  draftFormat.value = { ...draftFormat.value, [key]: String(value) }
}

function updateDraftMode(value: FormatTab) {
  const next = cloneDraftFormat()
  activeTab.value = value
  if (value === 'preset') {
    next.mode = 'preset'
    next.preset = next.preset ?? { type: 'datetime', pattern: 'yyyy-MM-dd HH:mm:ss' }
    next.custom = undefined
  }
  else if (value === 'custom') {
    next.mode = 'custom'
    next.custom = next.custom ?? { source: '(value) => String(value ?? \'\')' }
    next.preset = undefined
    next.prefix = undefined
    next.suffix = undefined
    next.fallback = undefined
  }
  draftFormat.value = next
}

function applyPresetChoice(choice: PresetChoice) {
  const next = cloneDraftFormat()
  if (!choice.preset) {
    next.mode = undefined
    next.preset = undefined
    next.custom = undefined
  }
  else {
    next.mode = 'preset'
    next.preset = { ...choice.preset }
    next.custom = undefined
  }
  draftFormat.value = next
  activeTab.value = 'preset'
}

function updateDraftCustomSource(value: string) {
  const next = cloneDraftFormat()
  next.mode = 'custom'
  next.custom = { source: value }
  next.preset = undefined
  draftFormat.value = next
  activeTab.value = 'custom'
}

function cloneDraftFormat(): BindingDisplayFormat {
  return {
    ...draftFormat.value,
    preset: draftFormat.value.preset ? { ...draftFormat.value.preset } : undefined,
    custom: draftFormat.value.custom ? { ...draftFormat.value.custom } : undefined,
  }
}

const activeBinding = computed(() => {
  if (activeBindingIndex.value === null)
    return undefined
  return bindings.value[activeBindingIndex.value]
})

const validationMessage = computed(() => validateFormat(draftFormat.value))

function openFormatDialog(ref: BindingRef, index: number) {
  activeBindingIndex.value = index
  draftFormat.value = cloneFormat(ref)
  activeTab.value = modeOf(ref) === 'custom' ? 'custom' : 'preset'
  formatDialogOpen.value = true
}

function resetFormatDialog() {
  formatDialogOpen.value = false
  activeBindingIndex.value = null
  draftFormat.value = {}
  activeTab.value = 'preset'
}

function confirmFormatDialog() {
  const ref = activeBinding.value
  const index = activeBindingIndex.value
  if (!ref || index === null || validationMessage.value)
    return
  emit('updateBindingFormat', cleanFormat(draftFormat.value), bindIndex(ref, index))
  resetFormatDialog()
}

function validateFormat(format: BindingDisplayFormat): string {
  if (format.mode === 'preset' && format.preset) {
    const min = format.preset.minimumFractionDigits
    const max = format.preset.maximumFractionDigits
    if (typeof min === 'number' && !Number.isFinite(min))
      return props.t('designer.bindingFormat.invalidDigits')
    if (typeof max === 'number' && !Number.isFinite(max))
      return props.t('designer.bindingFormat.invalidDigits')
    if (typeof min === 'number' && typeof max === 'number' && min > max)
      return props.t('designer.bindingFormat.invalidDigitRange')
  }
  return ''
}

function formatSummary(ref: BindingRef): string {
  const format = ref.format
  if (!format)
    return props.t('designer.bindingFormat.summaryRaw')

  const parts: string[] = []
  if (modeOf(ref) === 'preset' && format.preset)
    parts.push(`${props.t('designer.bindingFormat.summaryPreset')}: ${presetLabel(format.preset.type)}`)
  else if (modeOf(ref) === 'custom')
    parts.push(props.t('designer.bindingFormat.summaryCustom'))
  else
    parts.push(props.t('designer.bindingFormat.summaryRaw'))

  if (modeOf(ref) !== 'custom') {
    if (format.prefix)
      parts.push(props.t('designer.bindingFormat.summaryPrefix'))
    if (format.suffix)
      parts.push(props.t('designer.bindingFormat.summarySuffix'))
  }
  return parts.join(' / ')
}

function presetLabel(type: BindingFormatPresetType): string {
  return presetOptions.find(option => option.value === type)?.label ?? type
}

function activePresetChoiceId(): string {
  const preset = draftFormat.value.preset
  if (draftFormat.value.mode !== 'preset' || !preset)
    return 'raw'
  return presetChoices.find(choice => choice.preset && isSamePreset(choice.preset, preset))?.id ?? preset.type
}

function isSamePreset(a: BindingPresetFormat, b: BindingPresetFormat): boolean {
  return a.type === b.type
    && a.pattern === b.pattern
    && a.weekdayStyle === b.weekdayStyle
    && a.minimumFractionDigits === b.minimumFractionDigits
    && a.maximumFractionDigits === b.maximumFractionDigits
    && a.currency === b.currency
}
</script>

<template>
  <div class="ei-binding-section">
    <div class="ei-binding-section__header">
      <span class="ei-binding-section__title">{{ t('designer.property.dataBinding') }}</span>
    </div>
    <template v-if="bindings.length > 0">
      <div
        v-for="(binding, idx) in bindings"
        :key="idx"
        class="ei-binding-section__item"
      >
        <div class="ei-binding-section__ctx">
          <div class="ei-binding-section__ctx-pair">
            <span class="ei-binding-section__ctx-key">{{ t('designer.dataSource.source') }}</span>
            <span class="ei-binding-section__ctx-val">{{ binding.sourceName || binding.sourceId }}</span>
          </div>
          <span class="ei-binding-section__ctx-sep" />
          <div class="ei-binding-section__ctx-pair">
            <span class="ei-binding-section__ctx-key">{{ t('designer.dataSource.field') }}</span>
            <span class="ei-binding-section__ctx-val">{{ binding.fieldLabel || binding.fieldPath }}</span>
          </div>
        </div>
        <div class="ei-binding-section__fmt-row">
          <span
            class="ei-binding-section__fmt-badge"
            :data-mode="modeOf(binding)"
          >{{ modeOf(binding) === 'preset' ? '预设' : modeOf(binding) === 'custom' ? '自定义' : '原始' }}</span>
          <span class="ei-binding-section__fmt-text">{{ formatSummary(binding) }}</span>
          <button
            class="ei-binding-section__fmt-btn"
            type="button"
            @click="openFormatDialog(binding, idx)"
          >
            {{ t('designer.bindingFormat.configure') }}
          </button>
        </div>
      </div>
      <div class="ei-binding-section__footer">
        <EiButton size="sm" @click="handleClear">
          {{ t('designer.dataSource.unbind') }}
        </EiButton>
      </div>

      <EiDialog
        :open="formatDialogOpen"
        :title="t('designer.bindingFormat.dialogTitle')"
        :width="640"
        :confirm-text="t('designer.dialog.ok')"
        :cancel-text="t('designer.dialog.cancel')"
        :confirm-disabled="!!validationMessage"
        @update:open="value => { if (!value) resetFormatDialog() }"
        @cancel="resetFormatDialog"
        @close="resetFormatDialog"
        @confirm="confirmFormatDialog"
      >
        <div class="ei-bfd">
          <!-- Context strip -->
          <div v-if="activeBinding" class="ei-bfd__ctx">
            <div class="ei-bfd__ctx-item">
              <span class="ei-bfd__ctx-key">{{ t('designer.dataSource.source') }}</span>
              <span class="ei-bfd__ctx-val">{{ activeBinding.sourceName || activeBinding.sourceId }}</span>
            </div>
            <span class="ei-bfd__ctx-sep" />
            <div class="ei-bfd__ctx-item">
              <span class="ei-bfd__ctx-key">{{ t('designer.dataSource.field') }}</span>
              <span class="ei-bfd__ctx-val">{{ activeBinding.fieldLabel || activeBinding.fieldPath }}</span>
            </div>
          </div>

          <!-- Format section -->
          <div class="ei-bfd__block">
            <div class="ei-bfd__block-head">
              <span class="ei-bfd__block-title">转换格式</span>
              <div class="ei-bfd__seg">
                <button
                  v-for="option in modeOptions"
                  :key="option.value"
                  class="ei-bfd__seg-btn"
                  :class="{ 'ei-bfd__seg-btn--active': activeTab === option.value }"
                  type="button"
                  @click="updateDraftMode(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Preset mode -->
            <div v-if="activeTab === 'preset'" class="ei-bfd__preset-content">
              <!-- Prefix -->
              <div class="ei-bfd__affix-row">
                <span class="ei-bfd__affix-label">{{ t('designer.bindingFormat.prefix') }}</span>
                <EiInput
                  :model-value="draftFormat.prefix || ''"
                  @update:model-value="value => updateDraftTextField('prefix', value)"
                />
              </div>

              <!-- Preset groups -->
              <div
                v-for="group in presetGroups"
                :key="group.label"
                class="ei-bfd__group"
              >
                <div class="ei-bfd__group-label">
                  {{ group.label }}
                </div>
                <div class="ei-bfd__chips">
                  <button
                    v-for="choice in group.choices"
                    :key="choice.id"
                    class="ei-bfd__chip"
                    :class="{ 'ei-bfd__chip--active': activePresetChoiceId() === choice.id }"
                    type="button"
                    :title="choice.hint"
                    @click="applyPresetChoice(choice)"
                  >
                    <span class="ei-bfd__chip-label">{{ choice.label }}</span>
                    <span v-if="choice.hint" class="ei-bfd__chip-hint">{{ choice.hint }}</span>
                    <EiIcon
                      v-if="activePresetChoiceId() === choice.id"
                      :icon="IconCheck"
                      :size="11"
                      class="ei-bfd__chip-check"
                    />
                  </button>
                </div>
              </div>

              <!-- Suffix -->
              <div class="ei-bfd__affix-row">
                <span class="ei-bfd__affix-label">{{ t('designer.bindingFormat.suffix') }}</span>
                <EiInput
                  :model-value="draftFormat.suffix || ''"
                  @update:model-value="value => updateDraftTextField('suffix', value)"
                />
              </div>
            </div>

            <!-- Custom mode -->
            <div v-if="activeTab === 'custom'" class="ei-bfd__custom-body">
              <p class="ei-bfd__custom-desc">
                输入返回转换结果的箭头函数，参数 <code>value</code> 为字段原始值。函数完全控制输出，前缀、后缀、默认值均由函数自行处理。
              </p>
              <BindingCodeEditor
                :model-value="draftFormat.custom?.source || '(value) => String(value ?? \'\')'"
                :placeholder="t('designer.bindingFormat.customSource')"
                @update:model-value="updateDraftCustomSource"
              />
            </div>
          </div>

          <!-- Validation error -->
          <div v-if="validationMessage" class="ei-bfd__error">
            {{ validationMessage }}
          </div>
        </div>
      </EiDialog>
    </template>
    <div v-else class="ei-binding-section__empty">
      {{ t('designer.dataSource.dragHint') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
/* ── Properties-panel binding item ── */
.ei-binding-section {
  width: 100%;

  &__header {
    margin-bottom: 6px;
  }

  &__title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--ei-text-secondary, #999);
  }

  &__item {
    border: 1px solid var(--ei-border-color, #e4e4e4);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  /* Context row: source + separator + field */
  &__ctx {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px;
    background: var(--ei-panel-header-bg, #f6f6f6);
    border-bottom: 1px solid var(--ei-border-color, #e4e4e4);
  }

  &__ctx-pair {
    display: flex;
    align-items: baseline;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  &__ctx-key {
    font-size: 11px;
    color: var(--ei-text-secondary, #bbb);
    flex-shrink: 0;
  }

  &__ctx-val {
    font-size: 12px;
    font-weight: 500;
    color: var(--ei-text, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__ctx-sep {
    display: block;
    width: 1px;
    height: 10px;
    background: var(--ei-border-color, #d4d4d4);
    flex-shrink: 0;
    align-self: center;
  }

  /* Format summary row */
  &__fmt-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
  }

  &__fmt-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--ei-primary-soft, #e6f4ff);
    color: var(--ei-primary, #1890ff);

    &[data-mode='none'] {
      background: #f0f0f0;
      color: var(--ei-text-secondary, #999);
    }

    &[data-mode='custom'] {
      background: #fff7e6;
      color: #d46b08;
    }
  }

  &__fmt-text {
    flex: 1;
    font-size: 12px;
    color: var(--ei-text-secondary, #666);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__fmt-btn {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 11px;
    border: 1px solid var(--ei-border-color, #d0d0d0);
    border-radius: 3px;
    background: var(--ei-bg, #fff);
    color: var(--ei-text-secondary, #555);
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;

    &:hover {
      border-color: var(--ei-primary, #1890ff);
      color: var(--ei-primary, #1890ff);
    }
  }

  &__footer {
    margin-top: 4px;
  }

  &__empty {
    font-size: 12px;
    color: var(--ei-text-secondary, #999);
    padding: 4px 0;
  }
}

/* ── Format-configuration dialog body ── */
.ei-bfd {
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* Context strip */
  &__ctx {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    background: var(--ei-panel-header-bg, #f7f7f7);
    border: 1px solid var(--ei-border-color, #e8e8e8);
    border-radius: 6px;
  }

  &__ctx-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  &__ctx-key {
    font-size: 11px;
    color: var(--ei-text-secondary, #bbb);
    flex-shrink: 0;
  }

  &__ctx-val {
    font-size: 13px;
    font-weight: 500;
    color: var(--ei-text, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__ctx-sep {
    display: block;
    width: 1px;
    height: 14px;
    background: var(--ei-border-color, #d8d8d8);
    flex-shrink: 0;
    align-self: center;
  }

  /* Card-style blocks */
  &__block {
    border: 1px solid var(--ei-border-color, #e8e8e8);
    border-radius: 6px;
    overflow: hidden;
  }

  &__block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 14px;
    background: var(--ei-panel-header-bg, #f7f7f7);
    border-bottom: 1px solid var(--ei-border-color, #e8e8e8);
    gap: 8px;
  }

  &__block-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ei-text-secondary, #aaa);
  }

  /* Segmented control */
  &__seg {
    display: inline-flex;
    padding: 2px;
    background: #ebebeb;
    border-radius: 5px;
    gap: 1px;
  }

  &__seg-btn {
    padding: 3px 14px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--ei-text-secondary, #666);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, box-shadow 0.12s;

    &--active {
      background: var(--ei-bg, #fff);
      color: var(--ei-text, #333);
      font-weight: 500;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }

    &:not(&--active):hover {
      color: var(--ei-text, #444);
    }
  }

  /* Preset single-column content */
  &__preset-content {
    overflow-y: auto;
    max-height: 320px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__group-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: var(--ei-text-secondary, #bbb);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ei-border-color, #ececec);
  }

  /* Chip list */
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  &__chip {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    transition: background 0.12s;
    max-width: 180px;

    &:hover {
      background: color-mix(in srgb, var(--ei-primary, #1890ff) 7%, var(--ei-bg, #fff));
    }

    &--active {
      background: color-mix(in srgb, var(--ei-primary, #1890ff) 13%, var(--ei-bg, #fff));
      padding-right: 24px;
    }
  }

  &__chip-label {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--ei-text, #333);
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;

    .ei-bfd__chip--active & {
      color: var(--ei-primary, #1890ff);
      font-weight: 600;
    }
  }

  &__chip-hint {
    font-size: 10px;
    color: var(--ei-text-secondary, #bbb);
    line-height: 1.2;

    .ei-bfd__chip--active & {
      color: color-mix(in srgb, var(--ei-primary, #1890ff) 55%, var(--ei-text-secondary, #bbb));
    }
  }

  &__chip-check {
    position: absolute;
    top: 6px;
    right: 7px;
    color: var(--ei-primary, #1890ff);
    flex-shrink: 0;
  }

  /* Custom mode body */
  &__custom-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__custom-desc {
    margin: 0;
    padding: 7px 10px 7px 12px;
    border-left: 3px solid #ffa940;
    border-radius: 0 4px 4px 0;
    background: #fffbe6;
    font-size: 12px;
    color: var(--ei-text-secondary, #666);
    line-height: 1.6;

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      padding: 0 3px;
      background: rgba(0, 0, 0, 0.06);
      border-radius: 2px;
    }
  }

  /* Affix (prefix / suffix) inline rows */
  &__affix-row {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &__affix-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: var(--ei-text-secondary, #bbb);
  }

  /* Error bar */
  &__error {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 5px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    color: var(--ei-danger, #ff4d4f);
    font-size: 12px;
    line-height: 1.5;
  }
}
</style>
