# HiPrint 快速上手

## 环境准备

### 1. 安装 electron-hiprint 客户端

electron-hiprint 是一个独立的本地桌面应用，从 GitHub Release 下载对应平台的安装包即可：

前往 [electron-hiprint Releases](https://github.com/CcSimple/electron-hiprint/releases) 下载最新版本，支持 Windows / macOS / Linux。

启动后默认监听 `http://localhost:17521`。

### 2. 安装前端依赖

```bash
npm install vue-plugin-hiprint
# 或
pnpm add vue-plugin-hiprint
```

## 与 EasyInk Viewer 集成

EasyInk Playground 已内置 HiPrint 集成，可直接参考实现。核心步骤：

### 1. 创建打印驱动

实现 `PrintDriver` 接口，将 Viewer 页面发送到 HiPrint：

```ts
import type { PrintDriver, ViewerPrintContext } from '@easyink/viewer'
import { hiprint } from 'vue-plugin-hiprint'

export function createHiPrintDriver(): PrintDriver {
  return {
    id: 'hiprint-driver',
    async print(context: ViewerPrintContext) {
      const pages = context.container.querySelectorAll('.viewer-page')

      for (const page of pages) {
        const tpl = new hiprint.PrintTemplate()
        const panel = tpl.addPrintPanel({
          width: context.printPolicy.sheetSize.width,
          height: context.printPolicy.sheetSize.height,
          paperNumberDisabled: true,
        })
        panel.addPrintHtml({ options: { content: page.innerHTML } })

        await new Promise<void>((resolve, reject) => {
          tpl.on('printSuccess', () => resolve())
          tpl.on('printError', (e) => reject(e))
          tpl.print2({}, {
            printer: '你的打印机名称',
            margins: { marginType: 'none' },
          })
        })
      }
    },
  }
}
```

### 2. 注册驱动

```ts
import { createHiPrintDriver } from './drivers/hiprint-print-driver'

runtime.registerPrintDriver(createHiPrintDriver())
```

### 3. 调用打印

```ts
await runtime.print('hiprint-driver')
```

## 连接配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 服务地址 | `http://localhost:17521` | electron-hiprint 客户端地址 |
| 命名空间 | `easyink-playground` | WebSocket 命名空间，多实例隔离用 |

## 标签机特殊配置

对于 DELI 等标签打印机，驱动可能会忽略模板尺寸而回退到 A4 缩印。此时需要启用「强制使用模板纸张尺寸」：

```ts
tpl.print2({}, {
  printer: 'DELI 标签机',
  pageSize: {
    width: widthMicrons,   // 短边，单位微米
    height: heightMicrons, // 长边，单位微米
  },
  landscape: false,
  scaleFactor: 100,
  margins: { marginType: 'none' },
})
```

::: tip
普通小票机、连续纸打印机**不要**传 `pageSize`，让 Chromium 由打印机驱动自动选择当前介质。传了反而会导致驱动找不到匹配介质，把内容裁掉。
:::

## Playground 示例

项目 Playground 已完整集成 HiPrint，可直接体验：

- 启动 electron-hiprint 客户端（端口 17521）
- 启动 Playground（`pnpm dev`）
- 预览界面点击打印下拉菜单 -> 「HiPrint 打印」
- 在设置对话框中配置连接地址和打印机

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
- 点击设置对话框中的「刷新」按钮重新获取设备列表

**标签机打印内容被截断 / 缩印到 A4**
- 在打印机设置中开启「强制使用模板纸张尺寸」
