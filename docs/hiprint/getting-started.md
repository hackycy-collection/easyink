# HiPrint 快速上手

HiPrint 通道适合跨平台静默打印。EasyInk 已内置官方客户端和 Viewer 打印驱动，业务代码不需要再实现 WebSocket 连接、打印机发现或 PrintDriver。

## 第一步：启动 electron-hiprint

前往 [electron-hiprint Releases](https://github.com/CcSimple/electron-hiprint/releases) 下载对应平台安装包。

启动后默认监听 `http://localhost:17521`，保持运行即可。

## 第二步：安装依赖

```bash
pnpm add @easyink/viewer @easyink/print-hiprint
```

## 第三步：注册驱动并打印

```ts
import { createHiPrintClient, createHiPrintDriver } from '@easyink/print-hiprint'
import { createViewer } from '@easyink/viewer'

const viewer = createViewer({ iframe })
const hiPrint = createHiPrintClient()

viewer.registerPrintDriver(createHiPrintDriver({ client: hiPrint }))

await viewer.open({ schema, data })
await hiPrint.useDefaultPrinter()
await viewer.print({ driverId: 'hiprint' })
```

`createHiPrintDriver()` 默认使用 `pageSizeMode: 'driver'`，适合小票机、连续纸和由驱动决定介质的场景。用户只需要选择打印机，不需要理解 Viewer 的底层打印策略。

## 指定打印机

```ts
const hiPrint = createHiPrintClient({
  serviceUrl: 'http://localhost:17521',
  printerName: 'XP-80C',
})
```

也可以运行时选择：

```ts
const printers = await hiPrint.refreshPrinters()
hiPrint.setPrinter(printers[0]?.name)
```

## 标签机纸张策略

默认不向 electron-hiprint 强制传 `pageSize`，由打印机驱动使用当前介质。DELI 等标签机如果回退到 A4 缩印，再只为该设备开启：

```ts
hiPrint.setForcePageSize('DELI-DL-888D', true)
await viewer.print({ driverId: 'hiprint' })
```

普通小票机、连续纸和普通办公打印机通常保持关闭。

## Playground 示例

Playground 已使用官方包集成：

- [playground/src/hooks/useHiPrint.ts](../../playground/src/hooks/useHiPrint.ts) 只保留 Vue 状态和设置持久化
- [playground/src/drivers/hiprint-print-driver.ts](../../playground/src/drivers/hiprint-print-driver.ts) 调用 `@easyink/print-hiprint`

## 常见问题

**连接超时**：确认 electron-hiprint 客户端已启动并监听 17521 端口。

**未发现打印机**：确认系统打印机已正常安装，再调用 `hiPrint.refreshPrinters()`。

**标签内容缩印到 A4**：只对该标签机调用 `hiPrint.setForcePageSize(name, true)`。
