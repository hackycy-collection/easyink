import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HiPrintClient } from './client'

const runtime = vi.hoisted(() => {
  const addedHtml: Record<string, unknown>[] = []
  let successCallback: (() => void) | undefined

  class PrintTemplate {
    addPrintPanel = vi.fn(() => ({
      addPrintHtml: vi.fn((options: Record<string, unknown>) => {
        addedHtml.push(options)
      }),
    }))

    on = vi.fn((event: 'printSuccess' | 'printError', callback: () => void) => {
      if (event === 'printSuccess')
        successCallback = callback
    })

    print2 = vi.fn(() => {
      successCallback?.()
    })
  }

  return {
    addedHtml,
    init: vi.fn(),
    printers: [] as Array<{ name: string, isDefault?: boolean }>,
    refreshPrinterList: vi.fn(),
    PrintTemplate,
    hiwebSocket: {
      setHost: vi.fn(),
      hasIo: vi.fn(() => true),
      start: vi.fn(),
      stop: vi.fn(),
    },
  }
})

vi.mock('vue-plugin-hiprint', () => ({
  hiprint: runtime,
}))

beforeEach(() => {
  runtime.addedHtml.length = 0
  runtime.printers = []
  runtime.init.mockClear()
  runtime.refreshPrinterList.mockReset()
  runtime.hiwebSocket.setHost.mockReset()
  runtime.hiwebSocket.hasIo.mockReset().mockReturnValue(true)
  runtime.hiwebSocket.start.mockClear()
  runtime.hiwebSocket.stop.mockClear()
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('hi print client', () => {
  it('disconnects and clears devices when endpoint config changes', () => {
    const client = new HiPrintClient({ serviceUrl: 'http://one.test' })
    client.connectionState = 'connected'
    client.devices = [{ name: 'Old Printer' }]

    const reconnect = client.configure({ serviceUrl: 'http://two.test' })

    expect(reconnect).toBe(true)
    expect(runtime.hiwebSocket.stop).toHaveBeenCalledTimes(1)
    expect(client.connectionState).toBe('idle')
    expect(client.devices).toEqual([])
    expect(client.serviceUrl).toBe('http://two.test')
  })

  it('rejects printer refresh timeout instead of reporting an empty list', async () => {
    vi.useFakeTimers()
    const client = new HiPrintClient({ refreshDelayMs: 0, refreshTimeoutMs: 10 })
    client.connectionState = 'connected'
    runtime.refreshPrinterList.mockImplementation(() => {})

    const refresh = client.refreshPrinters()
    const assertion = expect(refresh).rejects.toMatchObject({ code: 'HIPRINT_PRINTER_REFRESH_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(10)

    await assertion
    expect(client.lastError).toBe('刷新 HiPrint 打印机列表超时')
  })

  it('serializes each viewer page with the root element for printing', async () => {
    const client = new HiPrintClient({ printerName: 'Printer A' })
    client.connectionState = 'connected'
    const page = document.createElement('section')
    page.className = 'ei-viewer-page'
    page.style.width = '80mm'
    page.innerHTML = '<span>hello</span>'

    await client.printPages([page], { width: 80, height: 60, printerName: 'Printer A' })

    expect(runtime.addedHtml).toHaveLength(1)
    expect(runtime.addedHtml[0]).toEqual({ options: { content: expect.stringContaining('class="ei-viewer-page"') } })
    expect(String((runtime.addedHtml[0] as { options: { content: string } }).options.content).startsWith('<section')).toBe(true)
  })
})
