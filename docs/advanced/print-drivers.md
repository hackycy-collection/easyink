# 自定义打印驱动开发

打印驱动将 Viewer 渲染后的页面发送到目标打印机。`@easyink/viewer` 内置浏览器打印驱动，你也可以开发自定义驱动对接远程打印机或专用硬件。

## PrintDriver 接口

```ts
import type { PrintDriver } from '@easyink/viewer'

interface PrintDriver {
  id: string
  print: (context: ViewerPrintContext) => Promise<void>
}
```

## ViewerPrintContext

打印驱动收到的上下文对象：

```ts
interface ViewerPrintContext extends ViewerExportContext {
  printPolicy: ViewerPrintPolicy     // 打印策略（纸张尺寸、方向等）
  renderedPages: ViewerPageMetrics[] // 已渲染的页面尺寸信息
  container?: HTMLElement            // 包含渲染页面的 DOM 容器
}

interface ViewerExportContext {
  schema: DocumentSchema
  data?: Record<string, unknown>
  entry: ExportEntry
  onPhase?: (event: ViewerTaskPhaseEvent) => void
  onProgress?: (event: ViewerTaskProgressEvent) => void
  onDiagnostic?: (event: ViewerDiagnosticEvent) => void
}

interface ViewerPageMetrics {
  index: number
  width: number
  height: number
  unit: string
}
```

## 注册驱动

```ts
viewer.registerPrintDriver({
  id: 'my-driver',
  async print(context) {
    // 实现打印逻辑
  },
})

// 使用驱动
await viewer.print({
  driverId: 'my-driver',
  pageSizeMode: 'fixed',
})
```

## 开发模式

### 模式一：直接发送 DOM

适用于 Electron 应用或可直接操作本地打印机的环境。

```ts
import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'

function createLocalPrintDriver(): PrintDriver {
  return {
    id: 'local-printer',
    async print(context: ViewerPrintContext) {
      // 获取渲染后的页面 DOM 元素
      const pages = context.container
        ? Array.from(context.container.querySelectorAll('.ei-viewer-page'))
        : []

      // 从 printPolicy 获取纸张尺寸
      const { sheetSize, orientation } = context.printPolicy
      const width = sheetSize?.width ?? 210
      const height = sheetSize?.height ?? 297

      context.onPhase?.({ phase: 'printing', message: '发送到打印机' })

      // 发送到本地打印服务
      await sendToPrinter({
        pages,
        paperWidth: width,
        paperHeight: height,
        orientation,
      })
    },
  }
}
```

### 模式二：先生成 PDF 再发送

适用于需要通过 HTTP/WebSocket 将打印任务发送到远程服务的场景。

```ts
import { renderPagesToPdfBlob } from '@easyink/export-plugin-dom-pdf'

function createRemotePrintDriver(): PrintDriver {
  return {
    id: 'remote-printer',
    async print(context: ViewerPrintContext) {
      const pages = Array.from(
        context.container?.querySelectorAll('.ei-viewer-page') ?? []
      )
      const { sheetSize } = context.printPolicy

      // 阶段 1：生成 PDF
      context.onPhase?.({ phase: 'preparing', message: '生成 PDF' })
      const pdfBlob = await renderPagesToPdfBlob({
        pages,
        widthMm: sheetSize?.width ?? 210,
        heightMm: sheetSize?.height ?? 297,
        onProgress: context.onProgress,
      })

      // 阶段 2：上传并打印
      context.onPhase?.({ phase: 'submitting', message: '发送打印任务' })
      const response = await fetch('https://print-service.example.com/print', {
        method: 'POST',
        body: pdfBlob,
        headers: { 'Content-Type': 'application/pdf' },
      })

      if (!response.ok) throw new Error('打印服务返回错误')

      context.onPhase?.({ phase: 'waiting', message: '等待打印完成' })
      const { jobId } = await response.json()
      await waitForPrintComplete(jobId)
    },
  }
}
```

### 模式三：WebSocket 流式打印

适用于需要实时通信的打印服务（如 electron-hiprint）。

```ts
function createWsPrintDriver(wsUrl: string): PrintDriver {
  let socket: WebSocket | null = null

  async function ensureConnected(): Promise<WebSocket> {
    if (socket?.readyState === WebSocket.OPEN) return socket
    return new Promise((resolve, reject) => {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => resolve(socket!)
      socket.onerror = () => reject(new Error('连接打印服务失败'))
    })
  }

  return {
    id: 'ws-printer',
    async print(context: ViewerPrintContext) {
      const ws = await ensureConnected()
      const pages = Array.from(
        context.container?.querySelectorAll('.ei-viewer-page') ?? []
      )

      context.onPhase?.({ phase: 'printing', message: '发送打印数据' })

      // 逐页发送
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]!
        context.onProgress?.({ current: i + 1, total: pages.length })

        await sendPageOverWs(ws, page, context.printPolicy)
      }
    },
  }
}
```

## 单位转换

`ViewerPrintPolicy` 中的尺寸单位可能与你的打印服务不同。常见的转换：

```ts
const UNIT_TO_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  inch: 25.4,
  pt: 0.352778,
  px: 25.4 / 96,
}

function toMillimeters(value: number, unit: string): number {
  return value * (UNIT_TO_MM[unit] ?? 1)
}
```

## 阶段报告

通过 `context.onPhase` 报告打印进度，让用户了解当前状态：

```ts
context.onPhase?.({ phase: 'preparing', message: '准备中' })
context.onPhase?.({ phase: 'printing', message: '打印中' })
context.onPhase?.({ phase: 'waiting', message: '等待结果' })
```

通过 `context.onProgress` 报告量化进度：

```ts
context.onProgress?.({ current: 1, total: 5, message: '打印第 1/5 页' })
```

通过 `context.onDiagnostic` 报告非致命问题：

```ts
context.onDiagnostic?.({
  category: 'print',
  severity: 'warning',
  code: 'LOW_INK',
  message: '打印机墨量低',
})
```

## Playground 参考

Playground 中有两个完整的打印驱动实现：

- `playground/src/drivers/hiprint-print-driver.ts` -- 直接发送 DOM 到 electron-hiprint
- `playground/src/drivers/print-service-driver.ts` -- 先生成 PDF 再通过 WebSocket 发送
