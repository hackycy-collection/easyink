import { EasyInkPrintError, normalizeJobStatus } from '@easyink/print-core'

export const DEFAULT_EASYINK_PRINTER_URL = 'http://localhost:18080'
const DEFAULT_CONNECT_TIMEOUT_MS = 5000
const DEFAULT_RESPONSE_TIMEOUT_MS = 15000
const DEFAULT_JOB_TIMEOUT_MS = 60000
const PDF_CHUNK_SIZE_BYTES = 1024 * 1024

export interface EasyInkPrinterClientOptions {
  serviceUrl?: string
  apiKey?: string
  connectTimeoutMs?: number
  responseTimeoutMs?: number
  defaultCopies?: number
  printerName?: string
}

export interface EasyInkPrinterDevice {
  name: string
  isDefault?: boolean
  isOnline?: boolean
  driverName?: string
  status?: { isReady?: boolean, message?: string } | string
  supportedPaperSizes?: Array<{ name: string, width: number, height: number }>
}

export interface EasyInkPrinterPaperSize {
  width: number
  height: number
  unit: 'mm' | 'inch'
}

export interface EasyInkPrinterOffset {
  x: number
  y: number
  unit: 'mm' | 'inch'
}

export interface EasyInkPrinterJob {
  jobId: string
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'unknown'
  printerName?: string
  errorMessage?: string
}

export interface EasyInkPrinterPrintPdfOptions {
  printerName?: string
  copies?: number
  paperSize?: EasyInkPrinterPaperSize
  forcePaperSize?: boolean
  landscape?: boolean
  offset?: EasyInkPrinterOffset
  dpi?: number
}

interface PendingRequest {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface PrinterResultMessage {
  id?: string
  success?: boolean
  data?: unknown
  event?: string
  errorInfo?: { code?: string, message?: string, details?: string }
}

export class EasyInkPrinterClient {
  serviceUrl: string
  apiKey?: string
  defaultCopies: number
  printerName?: string
  connectionState: 'idle' | 'connecting' | 'connected' | 'error' = 'idle'
  lastError = ''
  devices: EasyInkPrinterDevice[] = []
  jobs = new Map<string, EasyInkPrinterJob>()

  private ws: WebSocket | undefined
  private connectPromise: Promise<void> | undefined
  private readonly connectTimeoutMs: number
  private readonly responseTimeoutMs: number
  private readonly pendingRequests = new Map<string, PendingRequest>()

  constructor(options: EasyInkPrinterClientOptions = {}) {
    this.serviceUrl = options.serviceUrl ?? DEFAULT_EASYINK_PRINTER_URL
    this.apiKey = options.apiKey
    this.defaultCopies = options.defaultCopies ?? 1
    this.printerName = options.printerName
    this.connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
    this.responseTimeoutMs = options.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS
  }

  get isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  configure(options: Partial<EasyInkPrinterClientOptions>): boolean {
    const endpointChanged = (options.serviceUrl !== undefined && options.serviceUrl !== this.serviceUrl)
      || (options.apiKey !== undefined && options.apiKey !== this.apiKey)

    if (endpointChanged) {
      this.disconnect()
      this.devices = []
      this.jobs.clear()
      this.lastError = ''
    }

    if (options.serviceUrl !== undefined)
      this.serviceUrl = options.serviceUrl
    if (options.apiKey !== undefined)
      this.apiKey = options.apiKey
    if (options.defaultCopies !== undefined)
      this.defaultCopies = options.defaultCopies
    if (options.printerName !== undefined)
      this.printerName = options.printerName

    return endpointChanged
  }

  async connect(): Promise<void> {
    if (this.isConnected)
      return
    if (this.connectPromise)
      return this.connectPromise

    this.connectionState = 'connecting'
    this.lastError = ''

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false
      const socket = new WebSocket(this.wsUrl())
      this.ws = socket

      const timeout = setTimeout(() => {
        if (settled)
          return
        settled = true
        this.connectionState = 'error'
        this.lastError = `连接超时 (${this.serviceUrl})`
        this.connectPromise = undefined
        try {
          socket.close()
        }
        catch { /* ignore */ }
        reject(new EasyInkPrintError(this.lastError, 'PRINTER_CONNECT_TIMEOUT'))
      }, this.connectTimeoutMs)

      socket.onopen = () => {
        if (settled)
          return
        settled = true
        clearTimeout(timeout)
        this.connectionState = 'connected'
        this.lastError = ''
        this.connectPromise = undefined
        resolve()
      }

      socket.onmessage = (event) => {
        if (typeof event.data === 'string')
          this.handleMessage(event.data)
      }

      socket.onclose = () => {
        this.rejectPending(new EasyInkPrintError('连接已断开', 'PRINTER_DISCONNECTED'))
        this.ws = undefined
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          this.connectionState = 'error'
          this.lastError = '连接被关闭'
          this.connectPromise = undefined
          reject(new EasyInkPrintError(this.lastError, 'PRINTER_CONNECTION_CLOSED'))
          return
        }
        if (this.connectionState === 'connected')
          this.connectionState = 'idle'
      }

      socket.onerror = () => {
        if (!settled)
          this.lastError = '连接 EasyInk Printer 服务失败'
      }
    })

    return this.connectPromise
  }

  disconnect(): void {
    this.connectPromise = undefined
    this.rejectPending(new EasyInkPrintError('连接已断开', 'PRINTER_DISCONNECTED'))
    if (this.ws) {
      try {
        this.ws.close()
      }
      catch { /* ignore */ }
    }
    this.ws = undefined
    this.connectionState = 'idle'
  }

  async refreshPrinters(): Promise<EasyInkPrinterDevice[]> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.responseTimeoutMs)

    try {
      const response = await fetch(`${this.httpUrl()}/api/printers`, {
        headers: this.httpHeaders(),
        signal: controller.signal,
      })
      if (!response.ok)
        throw new EasyInkPrintError(`获取打印机列表失败: HTTP ${response.status}`, 'PRINTER_LIST_FAILED')

      const payload = await response.json() as { data?: unknown }
      const devices = normalizePrinterDevices(payload.data ?? payload)
      this.devices = devices
      this.ensureSelectedPrinter(devices)
      return devices
    }
    catch (cause) {
      if (cause instanceof EasyInkPrintError)
        throw cause
      const code = isAbortError(cause) ? 'PRINTER_LIST_TIMEOUT' : 'PRINTER_LIST_FAILED'
      throw new EasyInkPrintError('获取打印机列表失败', code, cause)
    }
    finally {
      clearTimeout(timeout)
    }
  }

  listPrinters(): Promise<EasyInkPrinterDevice[]> {
    return this.refreshPrinters()
  }

  async useDefaultPrinter(): Promise<string | undefined> {
    const devices = this.devices.length > 0 ? this.devices : await this.refreshPrinters()
    const printer = devices.find(device => device.isDefault) ?? devices[0]
    this.printerName = printer?.name
    return this.printerName
  }

  setPrinter(printerName: string | undefined): void {
    this.printerName = printerName
  }

  async printPdf(pdfBlob: Blob, options: EasyInkPrinterPrintPdfOptions = {}): Promise<string> {
    if (pdfBlob.size <= 0)
      throw new EasyInkPrintError('PDF 内容为空', 'PDF_EMPTY')
    await this.connect()

    const printerName = await this.resolvePrinterName(options.printerName)
    const uploadId = createId()
    const totalBytes = pdfBlob.size
    const totalChunks = Math.ceil(totalBytes / PDF_CHUNK_SIZE_BYTES)

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * PDF_CHUNK_SIZE_BYTES
      const end = Math.min(start + PDF_CHUNK_SIZE_BYTES, totalBytes)
      const payload = new Uint8Array(await pdfBlob.slice(start, end).arrayBuffer())
      await this.sendBinaryCommand('uploadPdfChunk', {
        uploadId,
        chunkIndex,
        totalChunks,
        totalBytes,
      }, payload)
    }

    const data = await this.sendCommand<{ jobId?: string, status?: string }>('printUploadedPdfAsync', {
      uploadId,
      printerName,
      copies: options.copies ?? this.defaultCopies,
      paperSize: options.paperSize,
      forcePaperSize: options.forcePaperSize,
      landscape: options.landscape,
      offset: options.offset,
      dpi: options.dpi,
    })

    const jobId = data?.jobId ?? ''
    if (!jobId)
      throw new EasyInkPrintError('打印服务未返回打印任务 ID', 'PRINT_JOB_ID_MISSING')

    this.jobs.set(jobId, {
      jobId,
      status: normalizeJobStatus(data.status ?? 'queued'),
      printerName,
    })
    return jobId
  }

  async printPdfAndWait(pdfBlob: Blob, options: EasyInkPrinterPrintPdfOptions & { timeoutMs?: number } = {}): Promise<EasyInkPrinterJob> {
    const jobId = await this.printPdf(pdfBlob, options)
    return this.waitForJob(jobId, options.timeoutMs)
  }

  async waitForJob(jobId: string, timeoutMs = DEFAULT_JOB_TIMEOUT_MS): Promise<EasyInkPrinterJob> {
    await this.connect()
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      const remoteJob = await this.sendCommand<Partial<EasyInkPrinterJob> & { status?: string }>('getJobStatus', { jobId })
      const job: EasyInkPrinterJob = {
        jobId: remoteJob.jobId ?? jobId,
        status: normalizeJobStatus(remoteJob.status),
        printerName: remoteJob.printerName,
        errorMessage: remoteJob.errorMessage,
      }
      this.jobs.set(jobId, job)

      if (job.status === 'completed')
        return job
      if (job.status === 'failed')
        throw new EasyInkPrintError(job.errorMessage ?? '打印任务失败', 'PRINT_JOB_FAILED')

      await delay(200)
    }

    throw new EasyInkPrintError('等待打印结果超时', 'PRINT_JOB_TIMEOUT')
  }

  private wsUrl(): string {
    const base = this.serviceUrl.replace(/^http/, 'ws')
    const url = new URL('/ws', base)
    if (this.apiKey)
      url.searchParams.set('apiKey', this.apiKey)
    return url.toString()
  }

  private httpUrl(): string {
    return this.serviceUrl.replace(/^ws/, 'http').replace(/\/$/, '')
  }

  private httpHeaders(): HeadersInit {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (this.apiKey)
      headers['X-API-Key'] = this.apiKey
    return headers
  }

  private sendCommand<T>(command: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new EasyInkPrintError('WebSocket 未连接', 'PRINTER_WS_NOT_CONNECTED'))
        return
      }

      const id = createId()
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new EasyInkPrintError(`请求超时: ${command}`, 'PRINTER_REQUEST_TIMEOUT'))
      }, this.responseTimeoutMs)

      this.pendingRequests.set(id, { resolve: data => resolve(data as T), reject, timer })
      try {
        this.ws.send(JSON.stringify({ command, id, params }))
      }
      catch (cause) {
        clearTimeout(timer)
        this.pendingRequests.delete(id)
        reject(new EasyInkPrintError(`发送打印请求失败: ${command}`, 'PRINTER_SEND_FAILED', cause))
      }
    })
  }

  private sendBinaryCommand<T>(command: string, params: Record<string, unknown>, payload: Uint8Array): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new EasyInkPrintError('WebSocket 未连接', 'PRINTER_WS_NOT_CONNECTED'))
        return
      }

      const id = createId()
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new EasyInkPrintError(`请求超时: ${command}`, 'PRINTER_REQUEST_TIMEOUT'))
      }, this.responseTimeoutMs)

      this.pendingRequests.set(id, { resolve: data => resolve(data as T), reject, timer })
      try {
        this.ws.send(encodeBinaryCommand(command, id, params, payload))
      }
      catch (cause) {
        clearTimeout(timer)
        this.pendingRequests.delete(id)
        reject(new EasyInkPrintError(`发送打印请求失败: ${command}`, 'PRINTER_SEND_FAILED', cause))
      }
    })
  }

  private handleMessage(raw: string): void {
    let message: PrinterResultMessage
    try {
      message = JSON.parse(raw) as PrinterResultMessage
    }
    catch {
      return
    }

    if (message.event === 'jobStatusChanged' && isRecord(message.data)) {
      const jobId = String(message.data.jobId ?? '')
      if (jobId) {
        this.jobs.set(jobId, {
          jobId,
          status: normalizeJobStatus(message.data.status),
          printerName: toOptionalString(message.data.printerName),
          errorMessage: toOptionalString(message.data.errorMessage),
        })
      }
      return
    }

    if (!message.id)
      return

    const pending = this.pendingRequests.get(message.id)
    if (!pending)
      return

    this.pendingRequests.delete(message.id)
    clearTimeout(pending.timer)

    if (message.success === false) {
      pending.reject(new EasyInkPrintError(
        message.errorInfo?.message ?? '打印服务请求失败',
        message.errorInfo?.code ?? 'PRINTER_REQUEST_FAILED',
        message.errorInfo,
      ))
      return
    }

    pending.resolve(message.data)
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(error)
      this.pendingRequests.delete(id)
    }
  }

  private ensureSelectedPrinter(devices: EasyInkPrinterDevice[]): void {
    if (devices.length === 0) {
      this.printerName = undefined
      return
    }
    if (this.printerName && devices.some(device => device.name === this.printerName))
      return
    this.printerName = devices.find(device => device.isDefault)?.name ?? devices[0]?.name
  }

  private async resolvePrinterName(printerName: string | undefined): Promise<string> {
    if (printerName)
      return printerName
    if (this.printerName)
      return this.printerName
    const selected = await this.useDefaultPrinter()
    if (selected)
      return selected
    throw new EasyInkPrintError('未选择打印机', 'PRINTER_NOT_SELECTED')
  }
}

export function createEasyInkPrinterClient(options?: EasyInkPrinterClientOptions): EasyInkPrinterClient {
  return new EasyInkPrinterClient(options)
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

function normalizePrinterDevices(data: unknown): EasyInkPrinterDevice[] {
  const rawList = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.printers)
      ? data.printers
      : []

  return rawList
    .filter(isRecord)
    .map(item => ({
      ...item,
      name: String(item.name ?? ''),
      isDefault: Boolean(item.isDefault),
    }))
    .filter(device => device.name.length > 0) as EasyInkPrinterDevice[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value)
}

function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError'
}

function createId(): string {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID()
  return `easyink-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
