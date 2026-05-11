<script setup lang="ts">
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { drawSelection, EditorView, keymap, lineNumbers, placeholder } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  t?: (key: string) => string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null

interface CodeExample {
  label: string
  code: string
}

const EXAMPLE_CODES = [
  `/**
 * 默认数据转换函数
 * 接收字段的原始值，返回最终显示在打印区域的文本内容
 * 空值（null / undefined）统一输出为空字符串
 * 可按需修改函数体，实现格式化、映射等处理逻辑
 * @param {*} value - 字段原始值
 * @returns {string} 处理后的显示文本
 */
function transform(value) {
  return value != null ? String(value) : ''
}`,
  `/**
 * 将字段原始值转换为字符串
 * 空值（null / undefined）统一输出为空字符串
 * @param {*} value - 字段原始值
 * @returns {string} 转换后的字符串
 */
function transform(value) {
  return String(value ?? '')
}`,
  `/**
 * 将数值格式化为人民币金额，保留两位小数
 * 非数字或无效值时显示占位符 '-'
 * @param {*} value - 字段原始值（数字或可转换为数字的字符串）
 * @returns {string}
 */
function transform(value) {
  var num = Number(value)
  if (isNaN(num)) return '-'
  return '\xA5' + num.toFixed(2)
}`,
  `/**
 * 将日期值格式化为 YYYY-MM-DD 格式
 * 支持时间戳，以及 YYYY-MM-DD / YYYY-MM-DDTHH:mm:ss / YYYY-MM-DD HH:mm:ss 这类明确格式
 * 无效日期返回空字符串
 * @param {*} value - 字段原始值（日期字符串或时间戳）
 * @returns {string}
 */
function parseDateValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value
  if (typeof value === 'number' && isFinite(value)) {
    var fromTimestamp = new Date(value)
    return isNaN(fromTimestamp.getTime()) ? null : fromTimestamp
  }
  if (typeof value !== 'string') return null
  var match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!match) return null
  var year = Number(match[1])
  var month = Number(match[2]) - 1
  var day = Number(match[3])
  var hour = Number(match[4] || 0)
  var minute = Number(match[5] || 0)
  var second = Number(match[6] || 0)
  var date = new Date(year, month, day, hour, minute, second)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  ) return null
  return date
}

function transform(value) {
  var d = parseDateValue(value)
  if (!d) return ''
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}`,
  `/**
 * 将整数状态码映射为对应的中文可读标签
 * 未匹配到映射时原样返回字段值的字符串形式
 * @param {*} value - 字段原始值（整数状态码）
 * @returns {string}
 */
function transform(value) {
  var map = { 0: '\u5F85\u5904\u7406', 1: '\u8FDB\u884C\u4E2D', 2: '\u5DF2\u5B8C\u6210' }
  return map[value] !== undefined ? map[value] : String(value ?? '')
}`,
]

const EXAMPLE_KEYS = [
  'designer.bindingFormat.examples.default',
  'designer.bindingFormat.examples.toString',
  'designer.bindingFormat.examples.currency',
  'designer.bindingFormat.examples.date',
  'designer.bindingFormat.examples.statusMap',
]

const EXAMPLE_LABELS_FALLBACK = [
  '默认转换函数',
  '原始值转字符串',
  '数值格式化为货币',
  '日期格式化 YYYY-MM-DD',
  '状态码映射为中文标签',
]

const examples = computed<CodeExample[]>(() =>
  EXAMPLE_CODES.map((code, i) => ({
    label: props.t ? props.t(EXAMPLE_KEYS[i]) : EXAMPLE_LABELS_FALLBACK[i],
    code,
  })),
)

function applyExample(code: string) {
  if (!view)
    return
  const current = view.state.doc.toString()
  if (current === code)
    return
  view.dispatch({
    changes: { from: 0, to: current.length, insert: code },
  })
}
const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff', fontWeight: '600' },
  { tag: tags.operatorKeyword, color: '#0000ff' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.bool, color: '#0000ff' },
  { tag: tags.null, color: '#0000ff' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#795e26' },
  { tag: tags.definition(tags.variableName), color: '#001080' },
  { tag: tags.variableName, color: '#001080' },
  { tag: tags.propertyName, color: '#001080' },
  { tag: tags.typeName, color: '#267f99' },
  { tag: tags.regexp, color: '#811f3f' },
])

const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    background: 'var(--ei-code-bg, #fbfbfb)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    height: '100%',
    lineHeight: '1.5',
    fontFamily: 'inherit',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: 'var(--ei-text, #333)',
    color: 'var(--ei-text, #333)',
  },
  '.cm-line': {
    padding: '0 12px',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--ei-text, #333)',
  },
  '&.cm-focused': {
    outline: '2px solid var(--ei-primary, #4a90e2)',
    outlineOffset: '-1px',
  },
  '.cm-gutters': {
    background: 'var(--ei-code-bg, #fbfbfb)',
    borderRight: '1px solid var(--ei-border-color, #e0e0e0)',
    color: '#aaa',
    minWidth: '30px',
    position: 'sticky',
    left: '0',
    zIndex: '1',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px',
    minWidth: '20px',
    textAlign: 'right',
  },
  '.cm-selectionBackground': {
    background: '#add6ff',
  },
  '&.cm-focused .cm-selectionBackground': {
    background: '#add6ff',
  },
  '.cm-placeholder': {
    color: 'var(--ei-text-secondary, #999)',
  },
}, { dark: false })

function createExtensions() {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    indentOnInput(),
    javascript(),
    syntaxHighlighting(lightHighlight),
    placeholder(props.placeholder || ''),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    lightTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
  ]
}

onMounted(() => {
  if (!containerRef.value)
    return
  const state = EditorState.create({
    doc: props.modelValue || '',
    extensions: createExtensions(),
  })
  view = new EditorView({
    state,
    parent: containerRef.value,
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

watch(() => props.modelValue, (newValue) => {
  if (!view)
    return
  const current = view.state.doc.toString()
  if ((newValue ?? '') !== current) {
    view.dispatch({
      changes: { from: 0, to: current.length, insert: newValue || '' },
    })
  }
})
</script>

<template>
  <div class="ei-bce">
    <div ref="containerRef" class="ei-bce__editor" />
    <div class="ei-bce__sidebar">
      <div class="ei-bce__sidebar-title">
        {{ props.t ? props.t('designer.bindingFormat.examples.title') : '示例' }}
      </div>
      <button
        v-for="(example, index) in examples"
        :key="index"
        type="button"
        class="ei-bce__example-btn"
        :title="example.label"
        @click="applyExample(example.code)"
      >
        {{ example.label }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ei-bce {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--ei-border-color, #d0d0d0);
  gap: 1px;

  &__editor {
    flex: 1;
    overflow: hidden;
    background: var(--ei-code-bg, #fbfbfb);
    border-radius: 3px 0 0 3px;

    :deep(.cm-editor) {
      height: 100%;
    }
  }

  &__sidebar {
    width: 114px;
    flex-shrink: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: var(--ei-code-bg, #fbfbfb);
    border-radius: 0 3px 3px 0;
  }

  &__sidebar-title {
    padding: 10px 12px 4px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: var(--ei-text-secondary, #bbb);
    user-select: none;
  }

  &__example-btn {
    width: 100%;
    text-align: left;
    padding: 7px 12px;
    border: none;
    border-radius: 0;
    background: transparent;
    font-size: 12px;
    color: var(--ei-text, #444);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: color-mix(in srgb, var(--ei-primary, #1890ff) 8%, transparent);
      color: var(--ei-primary, #1890ff);
    }
  }
}
</style>
