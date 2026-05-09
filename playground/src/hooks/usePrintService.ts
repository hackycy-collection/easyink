import { computed, reactive, ref, watch } from 'vue'

export const DEFAULT_PRINT_SERVICE_URL = 'http://localhost:18080'
const CONFIG_KEY = 'easyink:printServiceConfig'
const CONNECT_TIMEOUT_MS = 5000
const RESPONSE_TIMEOUT_MS = 15000
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const PDF_CHUNK_SIZE_BYTES = 1024 * 1024

export interface PrintServiceDevice {
  name: string
  isDefault: boolean
  status: { isReady: boolean, message: string }
  supportedPaperSizes: Array<{ name: string, width: number, height: number }>
}

export interface PaperSizeParams {
  width: number
  height: number
  unit: 'mm' | 'inch'
}

export interface OffsetParams {
  x: number
  y: number
  unit: 'mm' | 'inch'
}

export interface PrintJobInfo {
  jobId: string
  status: 'queued' | 'printing' | 'completed' | 'failed'
  printerName?: string
  errorMessage?: string
}

export interface PrintServiceConfig {
  enabled: boolean
  serviceUrl: string
  apiKey?: string
  printerName?: string
  copies: number
}

// ---------- config persistence ----------

function defaultConfig(): PrintServiceConfig {
  return {
    enabled: false,
    serviceUrl: DEFAULT_PRINT_SERVICE_URL,
    copies: 1,
  }
}

function loadConfig(): PrintServiceConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw)
      return defaultConfig()
    const parsed = JSON.parse(raw) as Partial<PrintServiceConfig>
    return {
      enabled: parsed.enabled ?? false,
      serviceUrl: parsed.serviceUrl ?? DEFAULT_PRINT_SERVICE_URL,
      apiKey: parsed.apiKey,
      printerName: parsed.printerName,
      copies: parsed.copies ?? 1,
    }
  }
  catch {
    return defaultConfig()
  }
}

function persistConfig(cfg: PrintServiceConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  }
  catch { /* quota */ }
}

// ---------- singleton state ----------

const config = reactive<PrintServiceConfig>(loadConfig())
const connectionState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const lastError = ref('')
const devices = ref<PrintServiceDevice[]>([])
const jobs = reactive(new Map<string, PrintJobInfo>())

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let reconnectAttempt = 0
const pendingRequests = new Map<string, { resolve: (data: any) => void, reject: (err: Error) => void, timer: ReturnType<typeof setTimeout> }>()

let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(config, (val) => {
  if (saveTimer)
    clearTimeout(saveTimer)
  saveTimer = setTimeout(persistConfig, 200, { ...val })
}, { deep: true })

// ---------- websocket internals ----------

function wsUrl(): string {
  const base = (config.serviceUrl || DEFAULT_PRINT_SERVICE_URL).replace(/^http/, 'ws')
  const url = new URL('/ws', base)
  if (config.apiKey)
    url.searchParams.set('apiKey', config.apiKey)
  return url.toString()
}

function sendCommand<T = any>(command: string, params?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 未连接'))
      return
    }
    const id = crypto.randomUUID()
    const timer = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error(`请求超时: ${command}`))
    }, RESPONSE_TIMEOUT_MS)
    pendingRequests.set(id, { resolve, reject, timer })
    ws.send(JSON.stringify({ command, id, params }))
  })
}

function encodeBinaryCommand(command: string, id: string, params: Record<string, unknown>, payload: Uint8Array): ArrayBuffer {
  const metadata = new TextEncoder().encode(JSON.stringify({ command, id, params }))
  const buffer = new ArrayBuffer(4 + metadata.length + payload.length)
  const frame = new Uint8Array(buffer)
  const view = new DataView(buffer)
  view.setUint32(0, metadata.length, false)
  frame.set(metadata, 4)
  frame.set(payload, 4 + metadata.length)
  return buffer
}

function sendBinaryCommand<T = any>(command: string, params: Record<string, unknown>, payload: Uint8Array): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 未连接'))
      return
    }

    const id = crypto.randomUUID()
    const timer = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error(`请求超时: ${command}`))
    }, RESPONSE_TIMEOUT_MS)

    pendingRequests.set(id, { resolve, reject, timer })
    ws.send(encodeBinaryCommand(command, id, params, payload))
  })
}

function handleMessage(raw: string) {
  let msg: any
  try {
    msg = JSON.parse(raw)
  }
  catch {
    return
  }

  // server push event
  if (msg.event === 'jobStatusChanged' && msg.data) {
    const d = msg.data
    const existing = jobs.get(d.jobId)
    if (existing) {
      existing.status = d.status ?? existing.status
      existing.errorMessage = d.errorMessage ?? existing.errorMessage
    }
    else {
      jobs.set(d.jobId, {
        jobId: d.jobId,
        status: d.status ?? 'unknown',
        printerName: d.printerName,
        errorMessage: d.errorMessage,
      })
    }
    return
  }

  // response to a pending request
  if (msg.id && pendingRequests.has(msg.id)) {
    const pending = pendingRequests.get(msg.id)!
    pendingRequests.delete(msg.id)
    clearTimeout(pending.timer)
    if (msg.success) {
      pending.resolve(msg.data)
    }
    else {
      const errInfo = msg.errorInfo ?? {}
      pending.reject(new Error(errInfo.message ?? '未知错误'))
    }
  }
}

function scheduleReconnect() {
  if (!config.enabled)
    return
  if (reconnectTimer)
    return
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS)
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect().catch(() => { /* surfaced via state */ })
  }, delay)
}

// ---------- public methods ----------

function connect(): Promise<void> {
  if (connectionState.value === 'connected')
    return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    connectionState.value = 'connecting'
    lastError.value = ''

    const url = wsUrl()
    let settled = false

    const timeout = setTimeout(() => {
      if (settled)
        return
      settled = true
      connectionState.value = 'error'
      lastError.value = `连接超时 (${config.serviceUrl})`
      try {
        ws?.close()
      }
      catch { /* */ }
      ws = null
      reject(new Error(lastError.value))
    }, CONNECT_TIMEOUT_MS)

    try {
      ws = new WebSocket(url)
    }
    catch (e) {
      settled = true
      clearTimeout(timeout)
      connectionState.value = 'error'
      lastError.value = e instanceof Error ? e.message : '连接失败'
      reject(new Error(lastError.value))
      return
    }

    ws.onopen = () => {
      if (settled)
        return
      settled = true
      clearTimeout(timeout)
      connectionState.value = 'connected'
      lastError.value = ''
      reconnectAttempt = 0
      resolve()
      // fetch printer list after connected
      refreshDevices().catch(() => { /* ignore */ })
    }

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        handleMessage(ev.data)
      }
    }

    ws.onclose = () => {
      // reject all pending requests
      for (const [id, p] of pendingRequests) {
        clearTimeout(p.timer)
        p.reject(new Error('连接已断开'))
        pendingRequests.delete(id)
      }
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        connectionState.value = 'error'
        lastError.value = '连接被关闭'
        reject(new Error(lastError.value))
      }
      else if (connectionState.value === 'connected') {
        connectionState.value = 'idle'
        ws = null
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      if (!settled) {
        // onerror usually followed by onclose, let onclose handle it
      }
    }
  })
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }
  reconnectAttempt = 0
  if (ws) {
    try {
      ws.close()
    }
    catch { /* */ }
    ws = null
  }
  connectionState.value = 'idle'
}

async function refreshDevices(): Promise<PrintServiceDevice[]> {
  const rawUrl = config.serviceUrl || DEFAULT_PRINT_SERVICE_URL
  const baseUrl = rawUrl.replace(/^ws/, 'http')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.apiKey)
    headers['X-API-Key'] = config.apiKey

  const res = await fetch(`${baseUrl}/api/printers`, { headers })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const list: PrintServiceDevice[] = Array.isArray(json?.data) ? json.data : []
  devices.value = list

  if (list.length > 0 && (!config.printerName || list.every(d => d.name !== config.printerName))) {
    const fallback = list.find(d => d.isDefault) ?? list[0]
    if (fallback)
      config.printerName = fallback.name
  }
  return list
}

async function printPdf(
  pdfBlob: Blob,
  opts: { printerName: string, copies: number, paperSize: PaperSizeParams, landscape?: boolean, offset?: OffsetParams },
): Promise<string> {
  if (pdfBlob.size <= 0)
    throw new Error('PDF 内容为空')

  const uploadId = crypto.randomUUID()
  const totalBytes = pdfBlob.size
  const totalChunks = Math.ceil(totalBytes / PDF_CHUNK_SIZE_BYTES)

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * PDF_CHUNK_SIZE_BYTES
    const end = Math.min(start + PDF_CHUNK_SIZE_BYTES, totalBytes)
    const payload = new Uint8Array(await pdfBlob.slice(start, end).arrayBuffer())
    await sendBinaryCommand('uploadPdfChunk', {
      uploadId,
      chunkIndex,
      totalChunks,
      totalBytes,
    }, payload)
  }

  const data = await sendCommand('printUploadedPdfAsync', {
    uploadId,
    printerName: opts.printerName,
    copies: opts.copies,
    paperSize: opts.paperSize,
    landscape: opts.landscape,
    offset: opts.offset,
  })
  const jobId: string = data?.jobId ?? ''
  if (!jobId)
    throw new Error('打印服务未返回打印任务 ID')

  if (jobId) {
    jobs.set(jobId, {
      jobId,
      status: data?.status ?? 'queued',
      printerName: opts.printerName,
    })
  }
  return jobId
}

function waitForJob(jobId: string): Promise<PrintJobInfo> {
  const existing = jobs.get(jobId)
  if (existing && (existing.status === 'completed' || existing.status === 'failed')) {
    return existing.status === 'completed'
      ? Promise.resolve(existing)
      : Promise.reject(new Error(existing.errorMessage ?? '打印失败'))
  }

  return new Promise((resolve, reject) => {
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      stop()
      reject(new Error('等待打印结果超时'))
    }, 60000)

    let checking = false

    async function check() {
      if (checking)
        return
      checking = true

      try {
        const remoteJob = await sendCommand<PrintJobInfo>('getJobStatus', { jobId })
        if (remoteJob?.jobId)
          jobs.set(jobId, remoteJob)
      }
      catch {
        // Keep waiting until the overall timeout; transient status polling failures are common around printer startup.
      }
      finally {
        checking = false
      }

      const job = jobs.get(jobId)
      if (!job)
        return
      if (job.status === 'completed') {
        stop()
        resolve(job)
      }
      else if (job.status === 'failed') {
        stop()
        reject(new Error(job.errorMessage ?? '打印失败'))
      }
    }

    function stop() {
      clearTimeout(timeout)
      if (interval)
        clearInterval(interval)
      jobs.delete(jobId) // cleanup
    }

    interval = setInterval(check, 200)
    void check()
  })
}

function setEnabled(enabled: boolean) {
  config.enabled = enabled
  if (enabled) {
    connect().catch(() => { /* surfaced via state */ })
  }
  else {
    disconnect()
  }
}

function updateConfig(patch: Partial<PrintServiceConfig>) {
  Object.assign(config, patch)
}

// auto-connect on load if previously enabled
if (config.enabled) {
  Promise.resolve().then(() => connect().catch(() => { /* surfaced via state */ }))
}

// ---------- public API ----------

export function usePrintService() {
  return {
    config,
    connectionState: computed(() => connectionState.value),
    isConnected: computed(() => connectionState.value === 'connected'),
    isConnecting: computed(() => connectionState.value === 'connecting'),
    isError: computed(() => connectionState.value === 'error'),
    lastError: computed(() => lastError.value),
    devices: computed(() => devices.value),
    jobs,
    enabled: computed(() => config.enabled),
    printerName: computed(() => config.printerName),
    copies: computed(() => config.copies),
    serviceUrl: computed(() => config.serviceUrl),

    connect,
    disconnect,
    setEnabled,
    updateConfig,
    refreshDevices,
    printPdf,
    waitForJob,
  }
}

export type PrintServiceStore = ReturnType<typeof usePrintService>
