<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const DEFAULT_JSON = JSON.stringify({}, null, 2)

const jsonText = ref(DEFAULT_JSON)
const parseError = ref('')
const copied = ref(false)

watch(jsonText, () => {
  try {
    const v = JSON.parse(jsonText.value)
    parseError.value = (typeof v !== 'object' || v === null || Array.isArray(v))
      ? '根数据必须是 JSON 对象'
      : ''
  }
  catch (e) {
    parseError.value = e instanceof Error ? e.message : String(e)
  }
})

function looksLikeUrl(v: string) {
  return /^https?:\/\//.test(v) || /\.(?:png|jpe?g|gif|svg|webp|bmp)$/i.test(v)
}

function buildFields(obj: Record<string, unknown>, parent = ''): unknown[] {
  return Object.entries(obj).map(([key, value]) => {
    const path = parent ? `${parent}/${key}` : key
    if (Array.isArray(value)) {
      const child = value.length > 0 && value[0] != null && typeof value[0] === 'object'
        ? buildFields(value[0] as Record<string, unknown>, path)
        : []
      return { name: key, title: key, path, tag: 'collection', expand: true, fields: child }
    }
    if (value != null && typeof value === 'object') {
      return { name: key, title: key, path, expand: true, fields: buildFields(value as Record<string, unknown>, path) }
    }
    return { name: key, title: key, path, use: typeof value === 'string' && looksLikeUrl(value) ? 'image' : 'text' }
  })
}

const output = computed(() => {
  if (parseError.value) {
    return ''
  }
  try {
    const data = JSON.parse(jsonText.value) as Record<string, unknown>
    return JSON.stringify({ id: 'custom', name: 'custom', title: '自定义数据', expand: true, fields: buildFields(data) }, null, 2)
  }
  catch {
    return ''
  }
})

function handleFormat() {
  try {
    jsonText.value = JSON.stringify(JSON.parse(jsonText.value), null, 2)
  }
  catch {}
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div class="ei-j2ds">
    <div class="ei-j2ds__section">
      <div class="ei-j2ds__bar">
        <span class="ei-j2ds__label">JSON 输入</span>
        <button class="ei-j2ds__btn" @click="handleFormat">
          格式化
        </button>
      </div>
      <textarea
        v-model="jsonText"
        class="ei-j2ds__textarea"
        spellcheck="false"
        autocomplete="off"
      />
      <div v-if="parseError" class="ei-j2ds__error">
        {{ parseError }}
      </div>
    </div>

    <div class="ei-j2ds__arrow">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div class="ei-j2ds__section">
      <div class="ei-j2ds__bar">
        <span class="ei-j2ds__label">DataSourceDescriptor</span>
        <button
          class="ei-j2ds__btn"
          :class="{ 'ei-j2ds__btn--ok': copied }"
          @click="handleCopy"
        >
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
      <pre class="ei-j2ds__pre">{{ output }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ei-j2ds {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.ei-j2ds__section {
  display: flex;
  flex-direction: column;
}

.ei-j2ds__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.ei-j2ds__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
}

.ei-j2ds__btn {
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.ei-j2ds__btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.ei-j2ds__btn--ok {
  border-color: var(--vp-c-green, #10b981);
  color: var(--vp-c-green, #10b981);
}

.ei-j2ds__textarea {
  display: block;
  width: 100%;
  min-height: 200px;
  margin: 0;
  padding: 14px 16px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  tab-size: 2;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.ei-j2ds__error {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--vp-c-danger-1, #f56c6c);
  background: var(--vp-c-danger-soft, rgba(245, 108, 108, 0.08));
}

.ei-j2ds__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.ei-j2ds__pre {
  margin: 0;
  padding: 14px 16px;
  min-height: 160px;
  overflow: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  white-space: pre;
}
</style>
