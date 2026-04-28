<script setup lang="ts">
import type { PrinterConfig, PrinterDevice } from '../hooks/usePrinter'
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
      return 'text-red-500'
    case 'disabled':
      return 'text-muted-foreground'
    default:
      return 'text-muted-foreground'
  }
})

function handleToggleService(checked: boolean) {
  localConfig.enablePrinterService = checked
  if (checked && !props.isConnected) {
    emit('connect')
  }
  else if (!checked && props.isConnected) {
    emit('disconnect')
  }
}

function handleConnect() {
  emit('connect')
}

function handleRefreshDevices() {
  emit('refreshDevices')
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
  <Dialog :open="true" @update:open="(val) => { if (!val) emit('close') }">
    <DialogContent class="max-w-[560px]">
      <DialogHeader>
        <DialogTitle>打印机设置</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Enable Printer Service -->
        <div class="flex items-center justify-between">
          <Label>启用打印服务</Label>
          <Switch
            :checked="localConfig.enablePrinterService"
            @update:checked="handleToggleService"
          />
        </div>

        <!-- Connection Status -->
        <div class="space-y-1.5">
          <Label>连接状态</Label>
          <div class="flex items-center gap-2">
            <span class="text-sm" :class="connectionStatusColor">{{ connectionStatusText }}</span>
            <Button
              v-if="localConfig.enablePrinterService && !isConnected"
              variant="outline"
              size="xs"
              @click="handleConnect"
            >
              连接
            </Button>
          </div>
        </div>

        <!-- Printer Service URL -->
        <div class="space-y-1.5">
          <Label>打印服务地址</Label>
          <Input
            v-model="localConfig.printerServiceUrl"
            :disabled="!localConfig.enablePrinterService"
            placeholder="http://localhost:17521"
          />
        </div>

        <!-- Printer Device -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <Label>打印机</Label>
            <Button
              v-if="localConfig.enablePrinterService"
              variant="outline"
              size="xs"
              :disabled="!isConnected"
              @click="handleRefreshDevices"
            >
              刷新
            </Button>
          </div>
          <Select
            :model-value="localConfig.printerDevice ?? ''"
            :disabled="!localConfig.enablePrinterService || !isConnected || printerDevices.length === 0"
            @update:model-value="(val) => localConfig.printerDevice = String(val) || undefined"
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择打印机" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="d in printerDevices"
                :key="d.name"
                :value="d.name"
              >
                {{ d.displayName }}{{ d.isDefault ? ' (默认)' : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Paper Size -->
        <div class="space-y-1.5">
          <Label>纸张宽度 (mm)</Label>
          <Input
            type="number"
            :value="localConfig.printerPaperSize"
            :min="1"
            :disabled="!localConfig.enablePrinterService"
            @input="(e: Event) => localConfig.printerPaperSize = Number((e.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Print Copies -->
        <div class="space-y-1.5">
          <Label>打印份数</Label>
          <Input
            type="number"
            :value="localConfig.printCopies"
            :min="1"
            :max="99"
            :disabled="!localConfig.enablePrinterService"
            @input="(e: Event) => localConfig.printCopies = Number((e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')">
          取消
        </Button>
        <Button @click="handleSave">
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
