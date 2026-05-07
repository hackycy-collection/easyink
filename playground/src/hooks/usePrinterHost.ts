import { computed, reactive, ref, watch } from 'vue'

export const DEFAULT_PRINTER_HOST_URL = 'http://localhost:18080'
const CONFIG_KEY = 'easyink:printerHostConfig'
const CONNECT_TIMEOUT_MS = 5000
const RESPONSE_TIMEOUT_MS = 15000
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

export interface PrinterHostDevice {
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

export interface PrintJobInfo {
  jobId: string
  status: 'queued' | 'printing' | 'completed' | 'failed'
  printerName?: string
  errorMessage?: string
}

export interface PrinterHostConfig {
  enabled: boolean
  serviceUrl: string
  apiKey?: string
  printerName?: string
  copies: number
}

// ---------- config persistence ----------

function defaultConfig(): PrinterHostConfig {
  return {
    enabled: false,
    serviceUrl: DEFAULT_PRINTER_HOST_URL,
    copies: 1,
  }
}

function loadConfig(): PrinterHostConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw)
      return defaultConfig()
    const parsed = JSON.parse(raw) as Partial<PrinterHostConfig>
    return {
      enabled: parsed.enabled ?? false,
      serviceUrl: parsed.serviceUrl ?? DEFAULT_PRINTER_HOST_URL,
      apiKey: parsed.apiKey,
      printerName: parsed.printerName,
      copies: parsed.copies ?? 1,
    }
  }
  catch {
    return defaultConfig()
  }
}

function persistConfig(cfg: PrinterHostConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  }
  catch { /* quota */ }
}

// ---------- singleton state ----------

const config = reactive<PrinterHostConfig>(loadConfig())
const connectionState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const lastError = ref('')
const devices = ref<PrinterHostDevice[]>([])
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
  const base = (config.serviceUrl || DEFAULT_PRINTER_HOST_URL).replace(/^http/, 'ws')
  const url = new URL('/ws', base)
  if (config.apiKey)
    url.searchParams.set('apiKey', config.apiKey)
  return url.toString()
}

function buildBinaryFrame(command: string, id: string, params: Record<string, unknown> | undefined, pdfBytes: ArrayBuffer): ArrayBuffer {
  const metadata = JSON.stringify({ command, id, params })
  const metaBytes = new TextEncoder().encode(metadata)
  const header = new ArrayBuffer(4)
  new DataView(header).setUint32(0, metaBytes.byteLength, false) // big-endian
  const frame = new Uint8Array(4 + metaBytes.byteLength + pdfBytes.byteLength)
  frame.set(new Uint8Array(header), 0)
  frame.set(metaBytes, 4)
  frame.set(new Uint8Array(pdfBytes), 4 + metaBytes.byteLength)
  return frame.buffer
}

function sendBinary(command: string, params: Record<string, unknown> | undefined, pdfBytes: ArrayBuffer): Promise<any> {
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
    const frame = buildBinaryFrame(command, id, params, pdfBytes)
    ws.send(frame)
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

async function refreshDevices(): Promise<PrinterHostDevice[]> {
  const rawUrl = config.serviceUrl || DEFAULT_PRINTER_HOST_URL
  const baseUrl = rawUrl.replace(/^ws/, 'http')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.apiKey)
    headers['X-API-Key'] = config.apiKey

  const res = await fetch(`${baseUrl}/api/printers`, { headers })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const list: PrinterHostDevice[] = Array.isArray(json?.data) ? json.data : []
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
  opts: { printerName: string, copies: number, paperSize: PaperSizeParams },
): Promise<string> {
  const pdfBytes = await pdfBlob.arrayBuffer()
  const data = await sendBinary('printAsync', {
    printerName: opts.printerName,
    copies: opts.copies,
    paperSize: opts.paperSize,
  }, pdfBytes)
  const jobId: string = data?.jobId ?? ''
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
    const timeout = setTimeout(() => {
      stop()
      reject(new Error('等待打印结果超时'))
    }, 60000)

    function check() {
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
      jobs.delete(jobId) // cleanup
    }

    // poll the map since reactive Map triggers are limited
    const interval = setInterval(check, 200)
    // also check immediately in case it already completed
    check()
    // override stop to also clear interval
    const origStop = stop
    const wrappedStop = () => {
      clearInterval(interval)
      origStop()
    }
    // rewire
    ;(check as any)._stop = wrappedStop
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

function updateConfig(patch: Partial<PrinterHostConfig>) {
  Object.assign(config, patch)
}

// auto-connect on load if previously enabled
if (config.enabled) {
  Promise.resolve().then(() => connect().catch(() => { /* surfaced via state */ }))
}

// ---------- public API ----------

export function usePrinterHost() {
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

export type PrinterHostStore = ReturnType<typeof usePrinterHost>
