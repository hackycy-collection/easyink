<script setup lang="ts">
import type { DataSourceDescriptor, DocumentSchema, ViewerHostAdapter, ViewerRuntime } from '@easyink/viewer'
import { IconChevronLeft, IconChevronRight, IconClose, IconMinimize, IconPlus } from '@easyink/icons'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { usePrinter } from './hooks/useHiPrint'
import { usePrinterHost } from './hooks/usePrinterHost'
import { renderPagesToPdfBlob } from './utils/pdf-export'

const props = defineProps<{
  schema: DocumentSchema
  data: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
}>()

const emit = defineEmits<{
  close: []
}>()

const EXPORT_FORMAT = 'playground-demo-json'
const UNIT_TO_MM = { mm: 1, cm: 10, in: 25.4, pt: 0.352778 } as const

const iframeRef = ref<HTMLIFrameElement>()
let viewerHost: ViewerHostAdapter | undefined
let viewer: ViewerRuntime | undefined

const zoom = ref(100)
const currentPage = ref(1)
const totalPages = ref(1)

// Printer integration
const printer = usePrinter()
const printerHost = usePrinterHost()
const showPrinterSettings = ref(false)
const showPrinterHostSettings = ref(false)
const isPrinting = ref(false)

function toMillimeters(value: number, unit: string): number {
  const factor = UNIT_TO_MM[unit as keyof typeof UNIT_TO_MM] || 1
  return value * factor
}

function resolvePrinterHostOffset(offset: ReturnType<typeof resolvePrintPolicy>['offset']): { x: number, y: number, unit: 'mm' } | undefined {
  const x = toMillimeters(offset.horizontal, offset.unit)
  const y = toMillimeters(offset.vertical, offset.unit)
  if (x === 0 && y === 0)
    return undefined
  return { x, y, unit: 'mm' }
}

// Auto-connect handled inside usePrinter() singleton based on persisted config.

onMounted(async () => {
  if (!iframeRef.value)
    return

  await waitForIframeDocument(iframeRef.value)
  viewerHost = createIframeViewerHost(iframeRef.value)
  setupIframeSurface(viewerHost)

  viewer = createViewer({ host: viewerHost })
  viewer.registerExportAdapter({
    id: 'playground-demo-export',
    format: EXPORT_FORMAT,
    async export(context) {
      return new Blob(
        [JSON.stringify({ schema: context.schema, data: context.data ?? {} }, null, 2)],
        { type: 'application/json' },
      )
    },
  })
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

function setupIframeSurface(host: ViewerHostAdapter) {
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

async function handleBrowserPrint(pageSizeMode: 'driver' | 'fixed' = 'driver') {
  await viewer?.print({ pageSizeMode })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function handlePdfExport() {
  const surface = getViewerSurface()
  if (!surface)
    return

  const pages = Array.from(surface.querySelectorAll<HTMLElement>('.ei-viewer-page'))
  if (pages.length === 0) {
    toast.error('没有可导出的页面')
    return
  }

  const renderedPages = viewer?.renderedPages ?? []
  const printPolicy = resolvePrintPolicy({
    schema: props.schema,
    options: { pageSizeMode: 'fixed' },
    renderedPages,
  })
  const printSize = printPolicy.sheetSize ?? renderedPages[0]
  if (!printSize) {
    toast.error('缺少 PDF 页面尺寸')
    return
  }

  const width = toMillimeters(printSize.width, printSize.unit)
  const height = toMillimeters(printSize.height, printSize.unit)
  const progressId = toast.loading('生成 PDF 中...')

  try {
    const pdfBlob = await renderPagesToPdfBlob({
      pages,
      widthMm: width,
      heightMm: height,
      onPageStart: (pageIndex, totalPages) => {
        toast.loading(`渲染页面 ${pageIndex + 1} / ${totalPages}`, { id: progressId })
      },
    })

    downloadBlob(pdfBlob, 'easyink-preview.pdf')
    toast.dismiss(progressId)
    toast.success('PDF 已下载')
  }
  catch (err) {
    toast.dismiss(progressId)
    toast.error(`PDF 导出失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function handleHiPrintPrint() {
  if (!printer.enabled.value) {
    toast.error('请先在设置中启用打印服务')
    showPrinterSettings.value = true
    return
  }

  if (!printer.isConnected.value) {
    const t = toast.loading('正在连接打印服务…')
    try {
      await printer.connect()
      toast.dismiss(t)
    }
    catch (e) {
      toast.dismiss(t)
      toast.error(e instanceof Error ? e.message : '连接打印服务失败')
      showPrinterSettings.value = true
      return
    }
  }

  if (!printer.printerDevice.value) {
    toast.error('请在设置中选择打印机')
    showPrinterSettings.value = true
    return
  }

  const surface = getViewerSurface()
  if (!surface)
    return

  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>('.ei-viewer-page'),
  )
  if (pages.length === 0) {
    toast.error('没有可打印的页面')
    return
  }

  const printerDevice = printer.printerDevice.value
  const renderedPages = viewer?.renderedPages ?? []
  const printPolicy = resolvePrintPolicy({
    schema: props.schema,
    options: { pageSizeMode: 'driver' },
    renderedPages,
  })
  const printSize = printPolicy.sheetSize ?? renderedPages[0]
  if (!printSize) {
    toast.error('缺少打印页面尺寸')
    return
  }
  const width = toMillimeters(printSize.width, printSize.unit)
  const height = toMillimeters(printSize.height, printSize.unit)

  isPrinting.value = true
  const progressId = pages.length > 1 ? toast.loading(`打印中 0 / ${pages.length}`) : undefined

  try {
    await printer.printPages(
      pages,
      {
        width,
        height,
        printer: printerDevice,
        forcePageSize: printer.isForcePageSize(printerDevice),
      },
      ({ current, total }) => {
        if (progressId !== undefined)
          toast.loading(`打印中 ${current} / ${total}`, { id: progressId })
      },
    )
    if (progressId !== undefined)
      toast.dismiss(progressId)
    toast.success(pages.length > 1 ? `已完成打印 (${pages.length} 页)` : '已发送到打印机')
  }
  catch (err) {
    if (progressId !== undefined)
      toast.dismiss(progressId)
    toast.error(`打印失败: ${err instanceof Error ? err.message : String(err)}`)
  }
  finally {
    isPrinting.value = false
  }
}

async function handlePrinterHostPrint() {
  if (!printerHost.enabled.value) {
    toast.error('请先在设置中启用 Printer.Host')
    showPrinterHostSettings.value = true
    return
  }

  if (!printerHost.isConnected.value) {
    const t = toast.loading('正在连接 Printer.Host...')
    try {
      await printerHost.connect()
      toast.dismiss(t)
    }
    catch (e) {
      toast.dismiss(t)
      toast.error(e instanceof Error ? e.message : '连接 Printer.Host 失败')
      showPrinterHostSettings.value = true
      return
    }
  }

  if (!printerHost.printerName.value) {
    toast.error('请在 Printer.Host 设置中选择打印机')
    showPrinterHostSettings.value = true
    return
  }

  const surface = getViewerSurface()
  if (!surface)
    return

  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>('.ei-viewer-page'),
  )
  if (pages.length === 0) {
    toast.error('没有可打印的页面')
    return
  }

  const printerName = printerHost.printerName.value
  const renderedPages = viewer?.renderedPages ?? []
  const printPolicy = resolvePrintPolicy({
    schema: props.schema,
    options: { pageSizeMode: 'fixed' },
    renderedPages,
  })
  const printSize = printPolicy.sheetSize ?? renderedPages[0]
  if (!printSize) {
    toast.error('缺少打印页面尺寸')
    return
  }
  const width = toMillimeters(printSize.width, printSize.unit)
  const height = toMillimeters(printSize.height, printSize.unit)
  const landscape = width > height

  isPrinting.value = true
  const progressId = toast.loading('生成 PDF 中...')

  try {
    const pdfBlob = await renderPagesToPdfBlob({
      pages,
      widthMm: width,
      heightMm: height,
      onPageStart: (pageIndex, totalPages) => {
        toast.loading(`渲染页面 ${pageIndex + 1} / ${totalPages}`, { id: progressId })
      },
    })

    toast.loading('发送打印任务...', { id: progressId })
    const jobId = await printerHost.printPdf(pdfBlob, {
      printerName,
      copies: printerHost.config.copies || 1,
      paperSize: { width, height, unit: 'mm' },
      landscape,
      offset: resolvePrinterHostOffset(printPolicy.offset),
    })

    toast.loading(`打印任务已提交 (${jobId.slice(0, 8)})`, { id: progressId })
    await printerHost.waitForJob(jobId)

    toast.dismiss(progressId)
    toast.success(pages.length > 1 ? `已完成打印 (${pages.length} 页)` : '已发送到打印机')
  }
  catch (err) {
    toast.dismiss(progressId)
    toast.error(`打印失败: ${err instanceof Error ? err.message : String(err)}`)
  }
  finally {
    isPrinting.value = false
  }
}

function openPrinterSettings() {
  showPrinterSettings.value = true
}

function openPrinterHostSettings() {
  showPrinterHostSettings.value = true
}

async function handleExport() {
  const blob = await viewer?.exportDocument(EXPORT_FORMAT)
  if (!(blob instanceof Blob))
    return

  downloadBlob(blob, 'easyink-export.json')
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
        <Button variant="outline" size="sm" @click="handleExport">
          导出
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm">
              打印
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="z-[10002]">
            <DropdownMenuItem :disabled="isPrinting" @click="handleBrowserPrint('driver')">
              浏览器打印（按打印机介质）
            </DropdownMenuItem>
            <DropdownMenuItem :disabled="isPrinting" @click="handlePdfExport">
              导出 PDF（固定纸张）
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
