<script setup lang="ts">
import type { TemplateSchema } from '@easyink/core'
import { ScreenRenderer } from '@easyink/renderer'
import { EasyInkDesigner } from '@easyink/designer'
import '../../packages/designer/src/theme/index.css'
import { nextTick, ref, watch } from 'vue'
import { sampleData, sampleDataSources } from './data'

const schema = ref<TemplateSchema | undefined>()
const bottomOpen = ref(false)
const previewRef = ref<HTMLElement | null>(null)

let previewRenderer: ScreenRenderer | null = null

function onSchemaUpdate(newSchema: TemplateSchema) {
  schema.value = newSchema
}

function toggleBottom() {
  bottomOpen.value = !bottomOpen.value
}

watch([() => schema.value, bottomOpen], async () => {
  if (!bottomOpen.value || !schema.value)
    return

  await nextTick()
  const container = previewRef.value
  if (!container)
    return

  if (!previewRenderer) {
    previewRenderer = new ScreenRenderer({ zoom: 0.5 })
  }

  container.innerHTML = ''
  try {
    previewRenderer.render(schema.value, sampleData, container)
  }
  catch {
    container.textContent = '渲染失败'
  }
}, { deep: false })

const schemaJson = ref('')
watch(() => schema.value, (s) => {
  schemaJson.value = s ? JSON.stringify(s, null, 2) : ''
}, { deep: false })
</script>

<template>
  <div class="app">
    <div class="designer-area">
      <EasyInkDesigner
        :schema="schema"
        :data-sources="sampleDataSources"
        @update:schema="onSchemaUpdate"
      />
    </div>

    <div class="bottom-toggle" @click="toggleBottom">
      {{ bottomOpen ? '▼ 收起面板' : '▲ 展开面板（Schema / 预览）' }}
    </div>

    <div v-if="bottomOpen" class="bottom-panel">
      <div class="bottom-pane">
        <h3>Schema JSON</h3>
        <textarea readonly :value="schemaJson" />
      </div>
      <div class="bottom-pane">
        <h3>渲染预览</h3>
        <div ref="previewRef" class="preview-container" />
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.designer-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.bottom-toggle {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  user-select: none;
}

.bottom-toggle:hover {
  background: #e8e8e8;
  color: #333;
}

.bottom-panel {
  display: flex;
  height: 300px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.bottom-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bottom-pane + .bottom-pane {
  border-left: 1px solid #e0e0e0;
}

.bottom-pane h3 {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.bottom-pane textarea {
  flex: 1;
  padding: 8px 12px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: none;
  outline: none;
  resize: none;
  background: #fafafa;
}

.preview-container {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #f5f5f5;
}
</style>
