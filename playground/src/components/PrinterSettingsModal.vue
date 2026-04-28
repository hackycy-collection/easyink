<script setup lang="ts">
import type { PrinterConfig, PrinterDevice } from '../hooks/usePrinter'
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue'
import { DEFAULT_PRINTER_COPIES, DEFAULT_PRINTER_HOST, DEFAULT_PRINTER_PAGE_SIZE } from '../hooks/usePrinter'

const props = defineProps<{
  config: PrinterConfig
  isConnected: boolean
  printerDevices: PrinterDevice[]
}>()

const emit = defineEmits<{
  save: [config: PrinterConfig]
  connect: []
  disconnect: []
  refreshDevices: []
  close: []
}>()

const localConfig = reactive<PrinterConfig>({
  enablePrinterService: props.config.enablePrinterService,
  printerDevice: props.config.printerDevice,
  printerPaperSize: props.config.printerPaperSize ?? DEFAULT_PRINTER_PAGE_SIZE,
  printCopies: props.config.printCopies ?? DEFAULT_PRINTER_COPIES,
  printerServiceUrl: props.config.printerServiceUrl ?? DEFAULT_PRINTER_HOST,
})

const modalZIndex = 10010

const connectionStatus = computed(() => {
  if (!localConfig.enablePrinterService)
    return 'disabled'
  return props.isConnected ? 'connected' : 'disconnected'
})

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接'
    case 'disconnected':
      return '未连接'
    case 'disabled':
      return '未启用'
    default:
      return '未知状态'
  }
})

const connectionStatusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'text-green-600'
    case 'disconnected':
      return 'text-red-600'
    case 'disabled':
      return 'text-gray-400'
    default:
      return 'text-gray-400'
  }
})

function handleToggleService(enabled: unknown) {
  localConfig.enablePrinterService = enabled as boolean
  if (enabled && !props.isConnected) {
    emit('connect')
  }
  else if (!enabled && props.isConnected) {
    emit('disconnect')
  }
}

function handleConnect() {
  emit('connect')
}

function handleRefreshDevices() {
  emit('refreshDevices')
}

function getSelectPopupContainer(trigger: HTMLElement) {
  return trigger.parentElement ?? document.body
}

function handleSave() {
  emit('save', { ...localConfig })
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <AModal
    :open="true"
    :z-index="modalZIndex"
    title="打印机设置"
    width="540px"
    @cancel="emit('close')"
    @ok="handleSave"
  >
    <AForm layout="vertical" class="space-y-4">
      <!-- Enable Printer Service -->
      <AFormItem label="启用打印服务">
        <ASwitch
          :checked="localConfig.enablePrinterService"
          @change="(checked) => handleToggleService(checked)"
        />
      </AFormItem>

      <!-- Connection Status -->
      <AFormItem label="连接状态">
        <div class="flex items-center gap-2">
          <span class="text-sm" :class="connectionStatusColor">{{ connectionStatusText }}</span>
          <AButton
            v-if="localConfig.enablePrinterService && !isConnected"
            size="small"
            @click="handleConnect"
          >
            连接
          </AButton>
        </div>
      </AFormItem>

      <!-- Printer Service URL -->
      <AFormItem label="打印服务地址">
        <AInput
          v-model:value="localConfig.printerServiceUrl"
          :disabled="!localConfig.enablePrinterService"
          placeholder="http://localhost:17521"
        />
      </AFormItem>

      <!-- Printer Device -->
      <AFormItem label="打印机">
        <template #extra>
          <AButton
            v-if="localConfig.enablePrinterService"
            size="small"
            :disabled="!isConnected"
            @click="handleRefreshDevices"
          >
            刷新
          </AButton>
        </template>
        <ASelect
          v-model:value="localConfig.printerDevice"
          :disabled="!localConfig.enablePrinterService || !isConnected || printerDevices.length === 0"
          :get-popup-container="getSelectPopupContainer"
          :options="printerDevices.map(d => ({ label: `${d.displayName}${d.isDefault ? ' (默认)' : ''}`, value: d.name }))"
          placeholder="请选择打印机"
        />
      </AFormItem>

      <!-- Paper Size -->
      <AFormItem label="纸张宽度 (mm)">
        <AInputNumber
          v-model:value="localConfig.printerPaperSize"
          :min="1"
          :disabled="!localConfig.enablePrinterService"
          class="w-full"
        />
      </AFormItem>

      <!-- Print Copies -->
      <AFormItem label="打印份数">
        <AInputNumber
          v-model:value="localConfig.printCopies"
          :min="1"
          :max="99"
          :disabled="!localConfig.enablePrinterService"
          class="w-full"
        />
      </AFormItem>
    </AForm>

    <template #footer>
      <AButton @click="emit('close')">
        取消
      </AButton>
      <AButton type="primary" @click="handleSave">
        保存
      </AButton>
    </template>
  </AModal>
</template>
