<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const preRef = ref<HTMLElement | null>(null)

const highlighted = computed(() => highlightJavaScript(props.modelValue || ''))

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function syncScroll(event: Event) {
  const target = event.target as HTMLTextAreaElement
  if (!preRef.value)
    return
  preRef.value.scrollTop = target.scrollTop
  preRef.value.scrollLeft = target.scrollLeft
}

function highlightJavaScript(source: string): string {
  const pattern = /\/\/.*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^\\'])*'|"(?:\\[\s\S]|[^\\"])*"|`(?:\\[\s\S]|[^\\`])*`|\b(?:const|let|var|return|if|else|for|while|switch|case|break|continue|function|typeof|new|try|catch|throw|class|extends|import|export|from|async|await)\b|\b(?:true|false|null|undefined|NaN|Infinity)\b|\b\d+(?:\.\d+)?\b/g
  let html = ''
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0
    html += escapeHtml(source.slice(cursor, start))
    html += wrapToken(match[0])
    cursor = start + match[0].length
  }
  html += escapeHtml(source.slice(cursor))
  return html || '&nbsp;'
}

function wrapToken(token: string): string {
  const escaped = escapeHtml(token)
  if (token.startsWith('//') || token.startsWith('/*'))
    return `<span class="tok-comment">${escaped}</span>`
  if (/^['"`]/.test(token))
    return `<span class="tok-string">${escaped}</span>`
  if (/^\d/.test(token))
    return `<span class="tok-number">${escaped}</span>`
  if (/^(?:true|false|null|undefined|NaN|Infinity)$/.test(token))
    return `<span class="tok-literal">${escaped}</span>`
  return `<span class="tok-keyword">${escaped}</span>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
</script>

<template>
  <div class="ei-code-editor">
    <pre ref="preRef" class="ei-code-editor__highlight" aria-hidden="true" v-html="highlighted" />
    <textarea
      class="ei-code-editor__input"
      spellcheck="false"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
      @scroll="syncScroll"
    />
  </div>
</template>

<style scoped lang="scss">
.ei-code-editor {
  position: relative;
  min-height: 260px;
  border: 1px solid var(--ei-border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--ei-code-bg, #fbfbfb);
  overflow: hidden;
}

.ei-code-editor__highlight,
.ei-code-editor__input {
  margin: 0;
  padding: 12px;
  width: 100%;
  height: 260px;
  box-sizing: border-box;
  border: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
}

.ei-code-editor__highlight {
  pointer-events: none;
  color: var(--ei-text, #333);
}

.ei-code-editor__input {
  position: absolute;
  inset: 0;
  resize: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: var(--ei-text, #333);
}

.ei-code-editor__input::placeholder {
  color: var(--ei-text-secondary, #999);
  -webkit-text-fill-color: var(--ei-text-secondary, #999);
}

:deep(.tok-comment) {
  color: #6a9955;
}

:deep(.tok-string) {
  color: #a31515;
}

:deep(.tok-number) {
  color: #098658;
}

:deep(.tok-literal) {
  color: #0000ff;
}

:deep(.tok-keyword) {
  color: #0000ff;
  font-weight: 600;
}
</style>
