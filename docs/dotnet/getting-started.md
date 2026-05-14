# 快速上手

EasyInk Printer 是 Windows 本地静默打印服务。前端使用 `@easyink/print-easyink-printer` 即可完成连接、打印机发现、PDF 生成、分块上传和任务等待，不需要业务侧手写 WebSocket 协议。

## 第一步：启动打印服务

### 下载预构建产物（推荐）

1. 前往 [GitHub Releases](https://github.com/hackycy/easyink/releases)
2. 下载最新版本的 `EasyInk.Printer` 压缩包
3. 解压后运行 `EasyInk.Printer.exe`

启动后系统托盘出现图标，默认监听 `http://localhost:18080`。

### 或从源码构建

```bash
cd lib/EasyInk.Net
dotnet build EasyInk.Engine/src
dotnet build EasyInk.Printer/src
dotnet run --project EasyInk.Printer/src
```

## 第二步：安装依赖

```bash
pnpm add @easyink/viewer @easyink/print-easyink-printer
```

## 第三步：注册驱动并打印

```ts
import { createEasyInkPrinterClient, createEasyInkPrinterDriver } from '@easyink/print-easyink-printer'
import { createViewer } from '@easyink/viewer'

const viewer = createViewer({ iframe })
const printer = createEasyInkPrinterClient()

viewer.registerPrintDriver(createEasyInkPrinterDriver({ client: printer }))

await viewer.open({ schema, data })
await printer.useDefaultPrinter()
await viewer.print({ driverId: 'easyink-printer' })
```

`createEasyInkPrinterDriver()` 默认使用 `pageSizeMode: 'fixed'`，会先把 Viewer 页面生成 PDF，再发送给 EasyInk.Printer。调用方不用再处理 PDF 导出插件、WebSocket 二进制帧、分块上传或任务轮询。

## 指定服务和打印机

```ts
const printer = createEasyInkPrinterClient({
  serviceUrl: 'http://localhost:18080',
  printerName: 'HP LaserJet',
  defaultCopies: 1,
})
```

也可以运行时选择：

```ts
const printers = await printer.refreshPrinters()
printer.setPrinter(printers[0]?.name)
```

## 打印已有 PDF

不需要 Viewer 时，直接打印已有 PDF：

```ts
const printer = createEasyInkPrinterClient()
const file = await fetch('/invoice.pdf').then(res => res.blob())

await printer.printPdfAndWait(file, {
  printerName: 'HP LaserJet',
  copies: 1,
})
```

## 纸张策略

默认 `forcePaperSize=false`，由打印机驱动使用当前介质；这适合小票机、连续纸和大多数办公打印机。

标签机必须显式按模板尺寸打印时再开启：

```ts
viewer.registerPrintDriver(createEasyInkPrinterDriver({
  client: printer,
  forcePaperSize: true,
}))
```

## Playground 示例

Playground 已使用官方包集成：

- [playground/src/hooks/useEasyInkPrint.ts](../../playground/src/hooks/useEasyInkPrint.ts) 只保留 Vue 状态和设置持久化
- [playground/src/drivers/easyink-print-driver.ts](../../playground/src/drivers/easyink-print-driver.ts) 调用 `@easyink/print-easyink-printer`

## 常见问题

**连接失败**：确认 `EasyInk.Printer.exe` 已运行且托盘图标可见。

**打印任务提交后无反应**：打开托盘管理窗口查看任务队列，并确认目标打印机在线。

**配置了 API Key**：创建客户端时传入 `apiKey`，包会自动处理 HTTP Header 和 WebSocket 查询参数。
