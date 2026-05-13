# 快速上手

本文档基于 Playground 实际代码，手把手带你完成 EasyInk Printer (.NET) 静默打印集成。

## 第一步：启动打印服务

### 下载预构建产物（推荐）

1. 前往 [GitHub Releases](https://github.com/hackycy/easyink/releases)
2. 下载最新版本的 `EasyInk.Printer` 压缩包
3. 解压后运行 `EasyInk.Printer.exe`

启动后系统托盘出现图标，默认监听 `http://localhost:18080`。

### 或从源码构建

```bash
# 环境：Windows 7 SP1+，.NET SDK 10.0+
cd lib/EasyInk.Net
powershell -File EasyInk.Printer/tools/download-sumatra.ps1   # 首次需要
dotnet build EasyInk.Engine/src
dotnet build EasyInk.Printer/src
dotnet run --project EasyInk.Printer/src
```

## 第二步：验证服务

```bash
# 服务状态
curl http://localhost:18080/api/status

# 可用打印机列表
curl http://localhost:18080/api/printers
```

## 第三步：实现连接管理 Hook

这是整个集成的核心，负责 WebSocket 连接、PDF 分块上传、打印任务轮询。

```ts
// src/hooks/useEasyInkPrint.ts
import { computed, ref } from 'vue'

const CONFIG_KEY = 'easyink:printServiceConfig'
interface PrintServiceConfig {
  enabled: boolean
  serviceUrl: string
  apiKey: string
  printerName: string
  copies: number
}

function loadConfig(): PrintServiceConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { enabled: false, serviceUrl: 'http://localhost:18080', apiKey: '', printerName: '', copies: 1 }
}

function saveConfig(config: PrintServiceConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

// ---- 模块级单例状态 ----
const config = ref<PrintServiceConfig>(loadConfig())
const connectionState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const lastError = ref<string>('')
const devices = ref<Array<{ name: string; isDefault: boolean }>>([])
const activeJobs = ref<Map<string, string>>(new Map())

let ws: WebSocket | null = null
let pendingRequests = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000

function persistConfig() {
  saveConfig(config.value)
}

// ---- WebSocket 通信 ----
function sendCommand(command: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 未连接'))
      return
    }
    const id = crypto.randomUUID()
    pendingRequests.set(id, { resolve, reject })
    ws.send(JSON.stringify({ command, id, params }))
    // 超时清理
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`命令 ${command} 超时`))
      }
    }, 30000)
  })
}

function sendBinaryCommand(command: string, metadata: Record<string, any>, payload: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 未连接'))
      return
    }
    const id = crypto.randomUUID()
    pendingRequests.set(id, { resolve, reject })

    const metaJson = new TextEncoder().encode(JSON.stringify({ command, id, ...metadata }))
    const metaLength = new ArrayBuffer(4)
    new DataView(metaLength).setUint32(0, metaJson.length, true)

    const frame = new Uint8Array(4 + metaJson.length + payload.byteLength)
    frame.set(new Uint8Array(metaLength), 0)
    frame.set(metaJson, 4)
    frame.set(new Uint8Array(payload), 4 + metaJson.length)
    ws.send(frame.buffer)

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`命令 ${command} 超时`))
      }
    }, 30000)
  })
}

function handleMessage(event: MessageEvent) {
  if (typeof event.data !== 'string') return
  try {
    const msg = JSON.parse(event.data)
    // 服务端推送事件
    if (msg.event === 'jobStatusChanged') {
      const { jobId, status } = msg.data
      if (status === 'completed' || status === 'failed') {
        activeJobs.value.delete(jobId)
      } else {
        activeJobs.value.set(jobId, status)
      }
    }
    // 命令响应
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id)!
      pendingRequests.delete(msg.id)
      if (msg.success === false) {
        reject(new Error(msg.error || '打印失败'))
      } else {
        resolve(msg.data ?? msg)
      }
    }
  } catch {}
}

// ---- 连接 ----
async function connect(): Promise<void> {
  if (connectionState.value === 'connected') return
  connectionState.value = 'connecting'
  lastError.value = ''

  return new Promise<void>((resolve, reject) => {
    const wsUrl = config.value.serviceUrl.replace(/^http/, 'ws') + '/ws'
      + (config.value.apiKey ? `?apiKey=${encodeURIComponent(config.value.apiKey)}` : '')

    const socket = new WebSocket(wsUrl)
    ws = socket

    const timeout = setTimeout(() => {
      socket.close()
      connectionState.value = 'error'
      lastError.value = '连接超时'
      reject(new Error('连接超时'))
    }, 5000)

    socket.onopen = () => {
      clearTimeout(timeout)
      connectionState.value = 'connected'
      reconnectDelay = 1000
      refreshDevices().catch(() => {})
      resolve()
    }

    socket.onmessage = handleMessage

    socket.onclose = () => {
      connectionState.value = 'idle'
      ws = null
      // 自动重连
      if (config.value.enabled) {
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000)
          connect().catch(() => {})
        }, reconnectDelay)
      }
    }

    socket.onerror = () => {
      clearTimeout(timeout)
      connectionState.value = 'error'
      lastError.value = '连接失败，请确认 EasyInk.Printer 已启动'
      reject(new Error(lastError.value))
    }
  })
}

// ---- 刷新打印机 ----
async function refreshDevices(): Promise<void> {
  const headers: Record<string, string> = {}
  if (config.value.apiKey) headers['X-API-Key'] = config.value.apiKey

  const resp = await fetch(`${config.value.serviceUrl}/api/printers`, { headers })
  const json = await resp.json()
  devices.value = json.data?.printers ?? []

  // 回退：如果当前选中的打印机不在列表中
  if (config.value.printerName && !devices.value.some(d => d.name === config.value.printerName)) {
    const defaultPrinter = devices.value.find(d => d.isDefault)
    config.value.printerName = defaultPrinter?.name ?? devices.value[0]?.name ?? ''
    persistConfig()
  }
}

// ---- PDF 分块上传 + 打印 ----
async function printPdf(pdfBlob: Blob, options: {
  printerName: string
  copies?: number
  paperSize?: { width: number; height: number; unit: string }
  landscape?: boolean
}): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024 // 1MB
  const totalChunks = Math.ceil(pdfBlob.size / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const chunk = pdfBlob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const buffer = await chunk.arrayBuffer()
    await sendBinaryCommand('uploadPdfChunk', {
      chunkIndex: i,
      totalChunks,
      sessionId: 'print-' + Date.now(),
    }, buffer)
  }

  const result = await sendCommand('printUploadedPdfAsync', {
    printerName: options.printerName,
    copies: options.copies ?? 1,
    paperSize: options.paperSize,
    landscape: options.landscape,
  })

  return result.jobId
}

// ---- 轮询等待打印完成 ----
async function waitForJob(jobId: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await sendCommand('getJobStatus', { jobId })
    if (result.status === 'completed') return
    if (result.status === 'failed') throw new Error(result.error || '打印任务失败')
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error('等待打印结果超时')
}

function setEnabled(enabled: boolean) {
  config.value.enabled = enabled
  persistConfig()
}

// ---- 导出单例 ----
export function useEasyInkPrint() {
  return {
    config,
    connectionState,
    isConnected: computed(() => connectionState.value === 'connected'),
    isConnecting: computed(() => connectionState.value === 'connecting'),
    isError: computed(() => connectionState.value === 'error'),
    lastError,
    devices,
    enabled: computed(() => config.value.enabled),
    printerName: computed(() => config.value.printerName),
    copies: computed(() => config.value.copies),
    activeJobs,
    connect,
    refreshDevices,
    printPdf,
    waitForJob,
    setEnabled,
  }
}
```

## 第四步：实现 PrintDriver

与 HiPrint 不同，EasyInk Printer 的流程是：先将 Viewer 页面渲染为 PDF，再上传 PDF 到 .NET 服务打印。

```ts
// src/drivers/easyink-print-driver.ts
import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { useEasyInkPrint } from '../hooks/useEasyInkPrint'

const UNIT_TO_MM: Record<string, number> = {
  cm: 10, in: 25.4, inch: 25.4, mm: 1, pt: 0.352778, px: 25.4 / 96,
}

function toMillimeters(value: number, unit: string): number {
  return value * (UNIT_TO_MM[unit] || 1)
}

function getViewerPages(container: HTMLElement | undefined): HTMLElement[] {
  if (!container) throw new Error('找不到打印内容')
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.ei-viewer-page'))
  if (pages.length === 0) throw new Error('没有可输出的页面')
  return pages
}

function resolvePrintLandscape(orientation: string, width: number, height: number): boolean {
  if (orientation === 'landscape') return true
  if (orientation === 'portrait') return false
  return width > height
}

export function createEasyInkPrintDriver(): PrintDriver {
  const service = useEasyInkPrint()

  return {
    id: 'easyink-print-driver',
    async print(context: ViewerPrintContext) {
      if (!service.enabled.value) throw new Error('打印服务未启用')
      if (!service.isConnected.value) await service.connect()
      if (!service.printerName.value) throw new Error('未选择打印机')

      const pages = getViewerPages(context.container)
      const sheetSize = context.printPolicy.sheetSize ?? context.renderedPages[0]
      if (!sheetSize) throw new Error('缺少打印页面尺寸')
      const widthMm = toMillimeters(sheetSize.width, sheetSize.unit)
      const heightMm = toMillimeters(sheetSize.height, sheetSize.unit)
      const landscape = resolvePrintLandscape(context.printPolicy.orientation, widthMm, heightMm)

      // 1. 将 Viewer 页面渲染为 PDF
      context.onPhase?.({ phase: 'preparing', message: '生成 PDF 中' })
      // 这里需要使用 @easyink/export-plugin-dom-pdf 或自行实现 PDF 生成
      // Playground 中使用 createDomPdfExportPlugin() 来生成 PDF Blob
      const pdfBlob = await renderPagesToPdf(pages, widthMm, heightMm, context.onProgress)

      // 2. 上传 PDF 到 EasyInk.Printer 服务
      context.onPhase?.({ phase: 'submitting', message: '发送打印任务' })
      const jobId = await service.printPdf(pdfBlob, {
        printerName: service.printerName.value,
        copies: service.config.copies || 1,
        paperSize: { width: widthMm, height: heightMm, unit: 'mm' },
        landscape,
      })

      // 3. 等待打印完成
      context.onPhase?.({ phase: 'waiting', message: `等待打印结果 (${jobId.slice(0, 8)})` })
      await service.waitForJob(jobId)
    },
  }
}

// PDF 渲染函数 -- 使用 @easyink/export-plugin-dom-pdf
async function renderPagesToPdf(
  pages: HTMLElement[],
  widthMm: number,
  heightMm: number,
  onProgress?: (progress: { current: number; total: number }) => void,
): Promise<Blob> {
  const { createDomPdfExportPlugin } = await import('@easyink/export-plugin-dom-pdf')
  const { createExportRuntime } = await import('@easyink/export-runtime')

  const exportRuntime = createExportRuntime({ entry: 'preview' })
  exportRuntime.registerPlugin(createDomPdfExportPlugin())

  const result = await exportRuntime.exportDocument({
    format: 'pdf',
    entry: 'preview',
    input: { pages, widthMm, heightMm },
    throwOnError: true,
    onProgress,
  })

  if (!(result instanceof Blob)) throw new Error('PDF 生成失败')
  return result
}
```

## 第五步：注册驱动并调用打印

```ts
import { createEasyInkPrintDriver } from './drivers/easyink-print-driver'

// 在 Viewer 初始化后注册
runtime.registerPrintDriver(createEasyInkPrintDriver())

// 调用打印（注意 pageSizeMode 用 'fixed'，与 HiPrint 的 'driver' 不同）
await runtime.print({ driverId: 'easyink-print-driver', pageSizeMode: 'fixed' })
```

## 第六步：纯 HTTP 调用（不依赖 Viewer）

如果你不需要 Viewer，直接调用 HTTP API 打印已有的 PDF：

```ts
// Base64 方式（小文件）
async function printBase64(pdfBase64: string, printerName: string) {
  const resp = await fetch('http://localhost:18080/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerName, pdfBase64, copies: 1 }),
  })
  return resp.json()
}

// 文件上传方式（大文件）
async function printFile(pdfFile: File, printerName: string) {
  const formData = new FormData()
  formData.append('params', JSON.stringify({ printerName, copies: 1 }))
  formData.append('pdf', pdfFile)
  const resp = await fetch('http://localhost:18080/api/print', {
    method: 'POST',
    body: formData,
  })
  return resp.json()
}

// 查询打印机
async function listPrinters() {
  const resp = await fetch('http://localhost:18080/api/printers')
  const { data } = await resp.json()
  return data.printers // [{ name: 'HP LaserJet', isDefault: true, ... }]
}
```

## Playground 完整示例

项目 Playground 已完整集成，可直接体验：

1. 启动 EasyInk.Printer（端口 18080）
2. 启动 Playground（`pnpm dev`）
3. 预览界面 -> 打印下拉菜单 -> 「EasyInk Printer 打印」
4. 在设置对话框中配置连接地址和打印机

相关源码：
- `playground/src/hooks/useEasyInkPrint.ts` -- 连接管理和打印 API
- `playground/src/drivers/easyink-print-driver.ts` -- PrintDriver 实现
- `playground/src/components/EasyInkPrinterSettingsDialog.vue` -- 设置界面

## 常见问题

**连接失败**
- 确认 `EasyInk.Printer.exe` 已运行且托盘图标可见
- 检查端口 18080 是否被占用
- 如配置了 API Key，前端请求需携带 `X-API-Key` 头

**打印任务提交后无反应**
- 在托盘图标双击打开管理窗口，查看任务队列
- 确认目标打印机已安装且在线

**PDF 生成失败**
- 确保已安装 `@easyink/export-plugin-dom-pdf` 和 `@easyink/export-runtime`

## 下一步

- [Engine DLL](./engine) -- 在 .NET 应用中直接集成打印引擎
- [Printer 应用](./printer) -- 完整的独立打印服务应用
- [API 参考](./api-reference) -- HTTP / WebSocket 接口详细文档
