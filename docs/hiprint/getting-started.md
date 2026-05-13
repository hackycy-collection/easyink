# HiPrint 快速上手

本文档基于 Playground 实际代码，手把手带你完成 HiPrint 静默打印集成。

## 第一步：安装 electron-hiprint 客户端

前往 [electron-hiprint Releases](https://github.com/CcSimple/electron-hiprint/releases) 下载对应平台安装包（Windows / macOS / Linux）。

启动后默认监听 `http://localhost:17521`，保持运行即可。

## 第二步：安装前端依赖

```bash
pnpm add vue-plugin-hiprint
```

由于 `vue-plugin-hiprint` 没有 TypeScript 类型声明，需要手动添加一个：

```ts
// src/hiprint.d.ts
declare module 'vue-plugin-hiprint'
```

## 第三步：实现连接管理 Hook

这是整个集成的核心，负责连接 electron-hiprint、发现打印机、执行打印。

```ts
// src/hooks/useHiPrint.ts
import { hiprint } from 'vue-plugin-hiprint'
import { computed, ref, shallowRef } from 'vue'

const NAMESPACE = 'easyink' // 多实例隔离用的命名空间

// ---- 配置持久化 ----
const CONFIG_KEY = 'easyink:printerConfig'
interface PrinterConfig {
  enabled: boolean
  serviceUrl: string
  printerDevice: string
  copies: number
  forcePageSizeByDevice: Record<string, boolean>
}

function loadConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { enabled: false, serviceUrl: 'http://localhost:17521', printerDevice: '', copies: 1, forcePageSizeByDevice: {} }
}

function saveConfig(config: PrinterConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

// ---- 模块级单例状态 ----
const config = ref<PrinterConfig>(loadConfig())
const connectionState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const lastError = ref<string>('')
const devices = ref<string[]>([])

function persistConfig() {
  saveConfig(config.value)
}

// ---- 连接 ----
async function connect(): Promise<void> {
  if (connectionState.value === 'connected') return
  connectionState.value = 'connecting'
  lastError.value = ''

  try {
    hiprint.hiwebSocket.setHost(config.value.serviceUrl, NAMESPACE)

    // 等待 WebSocket 打开（最多 4 秒）
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('连接超时，请确认 electron-hiprint 已启动')), 4000)
      const check = setInterval(() => {
        if (hiprint.hiwebSocket.opened) {
          clearInterval(check)
          clearTimeout(timeout)
          resolve()
        }
      }, 100)
    })

    connectionState.value = 'connected'
    await refreshDevices()
  } catch (err) {
    connectionState.value = 'error'
    lastError.value = err instanceof Error ? err.message : '连接失败'
    throw err
  }
}

// ---- 刷新打印机列表 ----
async function refreshDevices(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('获取打印机列表超时')), 2500)
    setTimeout(() => {
      hiprint.refreshPrinterList()
      setTimeout(() => {
        clearTimeout(timeout)
        const list = hiprint.printers?.map((p: any) => p.name) ?? []
        devices.value = list.filter(Boolean)
        // 如果当前选中的打印机不在列表中，回退到默认或第一个
        if (config.value.printerDevice && !devices.value.includes(config.value.printerDevice)) {
          config.value.printerDevice = devices.value[0] ?? ''
          persistConfig()
        }
        resolve()
      }, 300)
    }, 300)
  })
}

// ---- 打印单页 HTML ----
async function printHtml(html: string, options: {
  width: number       // mm
  height: number      // mm
  printer: string
  landscape?: boolean
  forcePageSize?: boolean
}): Promise<void> {
  const tpl = new hiprint.PrintTemplate()
  const panel = tpl.addPrintPanel({
    width: options.width,
    height: options.height,
    paperNumberDisabled: true,
  })
  panel.addPrintHtml({ options: { content: html } })

  const printOptions: Record<string, any> = {
    printer: options.printer,
    margins: { marginType: 'none' },
  }

  // 标签机需要强制指定纸张尺寸（微米）
  if (options.forcePageSize) {
    printOptions.pageSize = {
      width: Math.round(options.width * 1000),
      height: Math.round(options.height * 1000),
    }
    printOptions.landscape = options.landscape ?? false
    printOptions.scaleFactor = 100
  }

  return new Promise<void>((resolve, reject) => {
    tpl.on('printSuccess', () => resolve())
    tpl.on('printError', (e: any) => reject(new Error(String(e))))
    tpl.print2({}, printOptions)
  })
}

// ---- 打印多个 DOM 页面元素 ----
async function printPages(
  pages: HTMLElement[],
  options: { width: number; height: number; printer: string; landscape?: boolean; forcePageSize?: boolean },
  onProgress?: (progress: { current: number; total: number }) => void,
): Promise<void> {
  for (let i = 0; i < pages.length; i++) {
    await printHtml(pages[i].innerHTML, options)
    onProgress?.({ current: i + 1, total: pages.length })
  }
}

// ---- 工具函数 ----
function isForcePageSize(printerName: string): boolean {
  return config.value.forcePageSizeByDevice[printerName] ?? false
}

function setForcePageSize(printerName: string, force: boolean) {
  config.value.forcePageSizeByDevice[printerName] = force
  persistConfig()
}

function setEnabled(enabled: boolean) {
  config.value.enabled = enabled
  persistConfig()
}

// ---- 导出单例 ----
export function usePrinter() {
  return {
    config,
    connectionState,
    isConnected: computed(() => connectionState.value === 'connected'),
    isConnecting: computed(() => connectionState.value === 'connecting'),
    isError: computed(() => connectionState.value === 'error'),
    lastError,
    devices,
    enabled: computed(() => config.value.enabled),
    printerDevice: computed(() => config.value.printerDevice),
    copies: computed(() => config.value.copies),
    serviceUrl: computed(() => config.value.serviceUrl),
    connect,
    refreshDevices,
    printHtml,
    printPages,
    setEnabled,
    setForcePageSize,
    isForcePageSize,
  }
}
```

## 第四步：实现 PrintDriver

```ts
// src/drivers/hiprint-print-driver.ts
import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { usePrinter } from '../hooks/useHiPrint'

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

export function createHiPrintDriver(): PrintDriver {
  const printer = usePrinter()

  return {
    id: 'hiprint-driver',
    async print(context: ViewerPrintContext) {
      if (!printer.enabled.value) throw new Error('打印服务未启用')
      if (!printer.isConnected.value) await printer.connect()
      if (!printer.printerDevice.value) throw new Error('未选择打印机')

      const pages = getViewerPages(context.container)
      const sheetSize = context.printPolicy.sheetSize ?? context.renderedPages[0]
      if (!sheetSize) throw new Error('缺少打印页面尺寸')
      const width = toMillimeters(sheetSize.width, sheetSize.unit)
      const height = toMillimeters(sheetSize.height, sheetSize.unit)

      context.onPhase?.({ phase: 'printing', message: 'HiPrint 打印中' })
      await printer.printPages(pages, {
        width,
        height,
        orientation: context.printPolicy.orientation,
        printer: printer.printerDevice.value,
        forcePageSize: printer.isForcePageSize(printer.printerDevice.value),
      }, (progress) => {
        context.onProgress?.({ ...progress, message: 'HiPrint 打印中' })
      })
    },
  }
}
```

## 第五步：注册驱动并调用打印

```ts
import { createHiPrintDriver } from './drivers/hiprint-print-driver'

// 在 Viewer 初始化后注册
runtime.registerPrintDriver(createHiPrintDriver())

// 调用打印
await runtime.print({ driverId: 'hiprint-driver', pageSizeMode: 'driver' })
```

## 标签机配置

DELI 等标签打印机可能忽略模板尺寸回退到 A4 缩印。解决方法：在设置中对目标打印机开启「强制使用模板纸张尺寸」，驱动会自动传入 `pageSize`（微米单位）。

::: tip
普通小票机、连续纸打印机**不要**开启此选项。传了 `pageSize` 反而会让驱动找不到匹配介质，把内容裁掉。只对标签机开启。
:::

## Playground 完整示例

项目 Playground 已完整集成，可直接体验：

1. 启动 electron-hiprint 客户端（端口 17521）
2. 启动 Playground（`pnpm dev`）
3. 预览界面 -> 打印下拉菜单 -> 「HiPrint 打印」
4. 在设置对话框中配置连接地址和打印机

相关源码：
- `playground/src/hooks/useHiPrint.ts` -- 连接管理和打印 API
- `playground/src/drivers/hiprint-print-driver.ts` -- PrintDriver 实现
- `playground/src/components/HiPrintSettingsDialog.vue` -- 设置界面

## 常见问题

**连接超时**
- 确认 electron-hiprint 客户端已启动并监听 17521 端口
- 检查防火墙是否放行该端口

**未发现打印机**
- 确认系统打印机已正常安装
- 调用 `refreshDevices()` 重新获取设备列表

**标签机打印内容被截断 / 缩印到 A4**
- 对该打印机开启「强制使用模板纸张尺寸」
