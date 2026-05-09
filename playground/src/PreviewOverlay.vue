<script setup lang="ts">
import type { ExportFormatPlugin, ExportProgress } from '@easyink/export-runtime'
import type { DataSourceDescriptor, DocumentSchema, ViewerDiagnosticEvent, ViewerHost, ViewerPageMetrics, ViewerRuntime } from '@easyink/viewer'
import { createDomPdfExportPlugin } from '@easyink/export-plugin-dom-pdf'
import { createExportRuntime } from '@easyink/export-runtime'
import { IconChevronLeft, IconChevronRight, IconClose, IconDown, IconMinimize, IconPlus } from '@easyink/icons'
import { createIframeViewerHost, createViewer, resolvePrintPolicy } from '@easyink/viewer'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import PrinterHostSettingsModal from './components/PrinterHostSettingsModal.vue'
import PrinterSettingsModal from './components/PrinterSettingsModal.vue'
import { Button } from './components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { createHiPrintDriver } from './drivers/hiprint-print-driver'
import { createPrinterHostDriver } from './drivers/printer-host-driver'
import { usePrinter } from './hooks/useHiPrint'
import { usePrinterHost } from './hooks/usePrinterHost'
import { exportDiagnosticToViewerEvent, getViewerPages, resolvePrintSize, toMillimeters } from './utils/viewer-output'

const props = defineProps<{
  schema: DocumentSchema
  data: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
}>()

const emit = defineEmits<{
  close: []
}>()

const EXPORT_FORMAT = 'playground-demo-json'
const PDF_FORMAT = 'pdf'
const BROWSER_PRINT_DRIVER_ID = 'browser'
const HIPRINT_DRIVER_ID = 'hiprint-driver'
const PRINTER_HOST_DRIVER_ID = 'printer-host-driver'

const iframeRef = ref<HTMLIFrameElement>()
let viewerHost: ViewerHost | undefined
let viewer: ViewerRuntime | undefined
const exportRuntime = createExportRuntime({ entry: 'preview' })

const zoom = ref(100)
const currentPage = ref(1)
const totalPages = ref(1)

// Printer integration
const printer = usePrinter()
const printerHost = usePrinterHost()
const showPrinterSettings = ref(false)
const showPrinterHostSettings = ref(false)
const isPrinting = ref(false)

// Auto-connect handled inside usePrinter() singleton based on persisted config.

onMounted(async () => {
  if (!iframeRef.value)
    return

  await waitForIframeDocument(iframeRef.value)
  viewerHost = createIframeViewerHost(iframeRef.value)
  setupIframeSurface(viewerHost)

  viewer = createViewer({ host: viewerHost })
  registerOutputIntegrations(viewer)
  await viewer.open({
    schema: props.schema,
    data: props.data,
    dataSources: props.dataSources,
  })

  updatePageCount()
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  viewerHost?.mount.removeEventListener('wheel', handleWheel)
  viewerHost?.mount.removeEventListener('scroll', handleScroll)
  viewer?.destroy()
  viewer = undefined
  viewerHost = undefined
})

function registerOutputIntegrations(runtime: ViewerRuntime) {
  exportRuntime.registerPlugin(createDomPdfExportPlugin())
  exportRuntime.registerPlugin(createPlaygroundJsonExportPlugin())

  runtime.registerExporter({
    id: 'playground-pdf-export',
    format: PDF_FORMAT,
    async export(context) {
      const renderedPages = context.renderedPages ?? []
      const pages = getViewerPages(context.container)
      const printSize = resolveFixedExportSize(renderedPages)
      const widthMm = toMillimeters(printSize.width, printSize.unit)
      const heightMm = toMillimeters(printSize.height, printSize.unit)

      return exportRuntime.exportDocument({
        format: PDF_FORMAT,
        entry: context.entry,
        input: { pages, widthMm, heightMm },
        throwOnError: true,
        onProgress: context.onProgress,
        onDiagnostic: diagnostic => context.onDiagnostic?.(exportDiagnosticToViewerEvent(diagnostic)),
      })
    },
  })

  runtime.registerExporter({
    id: 'playground-json-export',
    format: EXPORT_FORMAT,
    async export(context) {
      return exportRuntime.exportDocument({
        format: EXPORT_FORMAT,
        entry: context.entry,
        input: { schema: context.schema, data: context.data ?? {} },
        throwOnError: true,
        onProgress: context.onProgress,
        onDiagnostic: diagnostic => context.onDiagnostic?.(exportDiagnosticToViewerEvent(diagnostic)),
      })
    },
  })

  runtime.registerPrintDriver(createHiPrintDriver())
  runtime.registerPrintDriver(createPrinterHostDriver())
}

function createPlaygroundJsonExportPlugin(): ExportFormatPlugin<{ schema: DocumentSchema, data: Record<string, unknown> }, Blob> {
  return {
    id: 'playground-json-export-runtime',
    format: EXPORT_FORMAT,
    async export(context) {
      return new Blob(
        [JSON.stringify(context.input, null, 2)],
        { type: 'application/json' },
      )
    },
  }
}

function resolveFixedExportSize(renderedPages: ViewerPageMetrics[]): { width: number, height: number, unit: string } {
  const printPolicy = resolvePrintPolicy({
    schema: props.schema,
    options: { pageSizeMode: 'fixed' },
    renderedPages,
  })
  return resolvePrintSize(printPolicy.sheetSize, renderedPages[0])
}

function waitForIframeDocument(iframe: HTMLIFrameElement): Promise<void> {
  if (iframe.contentDocument)
    return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      iframe.removeEventListener('load', handleLoad)
      reject(new Error('Viewer iframe document is not available'))
    }, 3000)

    function handleLoad() {
      window.clearTimeout(timeout)
      iframe.removeEventListener('load', handleLoad)
      resolve()
    }

    iframe.addEventListener('load', handleLoad, { once: true })
  })
}

function setupIframeSurface(host: ViewerHost) {
  host.document.documentElement.style.height = '100%'
  host.document.body.style.height = '100%'
  host.document.body.style.margin = '0'
  host.document.body.style.background = '#525659'
  host.mount.style.height = '100%'
  host.mount.style.overflow = 'auto'
  host.mount.style.boxSizing = 'border-box'
  host.mount.style.padding = '24px 32px'
  host.mount.style.background = '#525659'
  host.mount.addEventListener('wheel', handleWheel, { passive: false })
  host.mount.addEventListener('scroll', handleScroll)
}

function getViewerSurface(): HTMLElement | undefined {
  return viewerHost?.mount
}

function updatePageCount() {
  const surface = getViewerSurface()
  if (!surface)
    return
  const pages = surface.querySelectorAll('.ei-viewer-page')
  totalPages.value = Math.max(1, pages.length)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(zoom.value + delta)
  }
}

function setZoom(value: number) {
  zoom.value = Math.max(25, Math.min(400, value))
  applyZoom()
}

function applyZoom() {
  const surface = getViewerSurface()
  if (!surface)
    return
  const pages = surface.querySelectorAll<HTMLElement>('.ei-viewer-page')
  for (const page of pages) {
    page.style.transform = `scale(${zoom.value / 100})`
    page.style.transformOrigin = 'top center'
  }
}

function zoomIn() {
  setZoom(zoom.value + 25)
}

function zoomOut() {
  setZoom(zoom.value - 25)
}

function zoomFit() {
  const surface = getViewerSurface()
  if (!surface)
    return
  const firstPage = surface.querySelector<HTMLElement>('.ei-viewer-page')
  if (!firstPage)
    return

  const containerWidth = surface.clientWidth - 64
  const pageWidth = Number.parseFloat(firstPage.style.width) || firstPage.offsetWidth
  if (pageWidth <= 0)
    return

  setZoom(Math.floor((containerWidth / pageWidth) * 100))
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToPage(currentPage.value)
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToPage(currentPage.value)
  }
}

function scrollToPage(pageNum: number) {
  const surface = getViewerSurface()
  if (!surface)
    return
  const pages = surface.querySelectorAll('.ei-viewer-page')
  const target = pages[pageNum - 1]
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleScroll() {
  const surface = getViewerSurface()
  if (!surface)
    return
  const pages = surface.querySelectorAll('.ei-viewer-page')
  const containerRect = surface.getBoundingClientRect()
  const containerCenter = containerRect.top + containerRect.height / 2

  let closest = 1
  let minDist = Infinity
  pages.forEach((page, i) => {
    const rect = page.getBoundingClientRect()
    const center = rect.top + rect.height / 2
    const dist = Math.abs(center - containerCenter)
    if (dist < minDist) {
      minDist = dist
      closest = i + 1
    }
  })
  currentPage.value = closest
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function showWarningDiagnostic(event: ViewerDiagnosticEvent) {
  if (event.severity === 'warning')
    toast.warning(event.message)
}

function updateProgressToast(progressId: string | number, progress: ExportProgress, label: string) {
  if (progress.current !== undefined && progress.total !== undefined)
    toast.loading(`${label} ${progress.current} / ${progress.total}`, { id: progressId })
}

function updatePhaseToast(progressId: string | number, message: string | undefined, fallback: string) {
  toast.loading(message || fallback, { id: progressId })
}

async function runViewerExport(format: string, filename: string, label: string) {
  const progressId = toast.loading(`${label}中...`)
  try {
    const blob = await viewer?.exportDocument({
      format,
      entry: 'preview',
      throwOnError: true,
      onPhase: event => updatePhaseToast(progressId, event.message, `${label}中...`),
      onProgress: progress => updateProgressToast(progressId, progress, label),
      onDiagnostic: showWarningDiagnostic,
    })
    if (!(blob instanceof Blob))
      throw new Error('导出结果为空')

    downloadBlob(blob, filename)
    toast.dismiss(progressId)
    toast.success(`${label}完成`)
  }
  catch (err) {
    toast.dismiss(progressId)
    toast.error(`${label}失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function handlePdfExport() {
  await runViewerExport(PDF_FORMAT, 'easyink-preview.pdf', '导出 PDF')
}

async function handleJsonExport() {
  await runViewerExport(EXPORT_FORMAT, 'easyink-export.json', '导出 JSON')
}

async function handleBrowserPrint(pageSizeMode: 'driver' | 'fixed' = 'driver') {
  await runViewerPrint(BROWSER_PRINT_DRIVER_ID, pageSizeMode, '浏览器打印')
}

async function ensureHiPrintReady(): Promise<boolean> {
  if (!printer.enabled.value) {
    toast.error('请先在设置中启用打印服务')
    showPrinterSettings.value = true
    return false
  }

  if (!printer.isConnected.value) {
    const progressId = toast.loading('正在连接打印服务...')
    try {
      await printer.connect()
      toast.dismiss(progressId)
    }
    catch (err) {
      toast.dismiss(progressId)
      toast.error(err instanceof Error ? err.message : '连接打印服务失败')
      showPrinterSettings.value = true
      return false
    }
  }

  if (!printer.printerDevice.value) {
    toast.error('请在设置中选择打印机')
    showPrinterSettings.value = true
    return false
  }

  return true
}

async function ensurePrinterHostReady(): Promise<boolean> {
  if (!printerHost.enabled.value) {
    toast.error('请先在设置中启用 Printer.Host')
    showPrinterHostSettings.value = true
    return false
  }

  if (!printerHost.isConnected.value) {
    const progressId = toast.loading('正在连接 Printer.Host...')
    try {
      await printerHost.connect()
      toast.dismiss(progressId)
    }
    catch (err) {
      toast.dismiss(progressId)
      toast.error(err instanceof Error ? err.message : '连接 Printer.Host 失败')
      showPrinterHostSettings.value = true
      return false
    }
  }

  if (!printerHost.printerName.value) {
    toast.error('请在 Printer.Host 设置中选择打印机')
    showPrinterHostSettings.value = true
    return false
  }

  return true
}

async function runViewerPrint(driverId: string, pageSizeMode: 'driver' | 'fixed', label: string) {
  isPrinting.value = true
  const progressId = toast.loading(`${label}中...`)
  try {
    await viewer?.print({
      driverId,
      pageSizeMode,
      throwOnError: true,
      onPhase: event => updatePhaseToast(progressId, event.message, `${label}中...`),
      onProgress: progress => updateProgressToast(progressId, progress, label),
      onDiagnostic: showWarningDiagnostic,
    })
    toast.dismiss(progressId)
    toast.success(label === '浏览器打印' ? '已打开浏览器打印' : '已发送到打印机')
  }
  catch (err) {
    toast.dismiss(progressId)
    toast.error(`${label}失败: ${err instanceof Error ? err.message : String(err)}`)
  }
  finally {
    isPrinting.value = false
  }
}

async function handleHiPrintPrint() {
  if (await ensureHiPrintReady())
    await runViewerPrint(HIPRINT_DRIVER_ID, 'driver', 'HiPrint 打印')
}

async function handlePrinterHostPrint() {
  if (await ensurePrinterHostReady())
    await runViewerPrint(PRINTER_HOST_DRIVER_ID, 'fixed', 'Printer.Host 打印')
}

function openPrinterSettings() {
  showPrinterSettings.value = true
}

function openPrinterHostSettings() {
  showPrinterHostSettings.value = true
}

async function handleExport() {
  await handleJsonExport()
}
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex flex-col bg-black/60">
    <div class="flex items-center justify-between px-4 py-1.5 bg-background border-b border-border gap-2">
      <div class="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" :disabled="currentPage <= 1" @click="prevPage">
          <IconChevronLeft :size="16" />
        </Button>
        <span class="text-xs text-muted-foreground min-w-[48px] text-center select-none">{{ currentPage }} / {{ totalPages }}</span>
        <Button variant="outline" size="icon-sm" :disabled="currentPage >= totalPages" @click="nextPage">
          <IconChevronRight :size="16" />
        </Button>

        <span class="w-px h-[18px] bg-border mx-1" />

        <Button variant="outline" size="icon-sm" @click="zoomOut">
          <IconMinimize :size="16" />
        </Button>
        <span class="text-xs text-muted-foreground min-w-[48px] text-center select-none">{{ zoom }}%</span>
        <Button variant="outline" size="icon-sm" @click="zoomIn">
          <IconPlus :size="16" />
        </Button>
        <Button variant="outline" size="sm" @click="zoomFit">
          适应宽度
        </Button>
      </div>

      <div class="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="gap-1">
              导出
              <IconDown :size="14" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="z-[10002]">
            <DropdownMenuLabel>文件导出</DropdownMenuLabel>
            <DropdownMenuItem :disabled="isPrinting" @click="handlePdfExport">
              PDF（固定纸张）
            </DropdownMenuItem>
            <DropdownMenuItem :disabled="isPrinting" @click="handleExport">
              JSON（模板数据）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" class="gap-1">
              打印
              <IconDown :size="14" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="z-[10002]">
            <DropdownMenuLabel>打印通道</DropdownMenuLabel>
            <DropdownMenuItem :disabled="isPrinting" @click="handleBrowserPrint('driver')">
              浏览器打印（按打印机介质）
            </DropdownMenuItem>
            <DropdownMenuItem :disabled="isPrinting" @click="handleHiPrintPrint">
              HiPrint 打印
            </DropdownMenuItem>
            <DropdownMenuItem :disabled="isPrinting" @click="handlePrinterHostPrint">
              Printer.Host 打印
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="openPrinterSettings">
              打印设置
            </DropdownMenuItem>
            <DropdownMenuItem @click="openPrinterHostSettings">
              Printer.Host 设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon-sm" @click="emit('close')">
          <IconClose :size="16" />
        </Button>
      </div>
    </div>

    <iframe
      ref="iframeRef"
      title="EasyInk Viewer"
      class="flex-1 w-full border-0 bg-[#525659]"
    />
  </div>

  <PrinterSettingsModal
    v-if="showPrinterSettings"
    @close="showPrinterSettings = false"
  />

  <PrinterHostSettingsModal
    v-if="showPrinterHostSettings"
    @close="showPrinterHostSettings = false"
  />
</template>
