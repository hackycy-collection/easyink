# Viewer

[![npm](https://img.shields.io/npm/v/@easyink/viewer?style=flat&colorA=080f12&colorB=1fa669)](https://npmjs.com/package/@easyink/viewer)

`@easyink/viewer` 是一个独立的文档预览引擎。接收 Schema + 数据，产出渲染后的页面 DOM、缩略图、打印和导出能力。可独立于 Designer 使用。

## 基本用法

```ts
import { createIframeViewerHost, createViewer } from '@easyink/viewer'

// 1. 创建 Host（决定渲染在哪里）
const host = createIframeViewerHost(iframeElement)

// 2. 创建 Viewer 运行时
const viewer = createViewer({ host })

// 3. 打开文档
await viewer.open({
  schema: documentSchema,
  data: { title: 'Hello', items: [...] },
  dataSources: [{ id: 'ds1', fields: [...] }],
})

// 4. 使用完毕后销毁
viewer.destroy()
```

## ViewerOptions

`createViewer(options)` 接受的配置项：

| 选项 | 类型 | 说明 |
|------|------|------|
| `mode` | `'fixed' \| 'stack' \| 'label'` | 渲染模式，默认 `'fixed'` |
| `host` | `ViewerHost` | 渲染宿主，通过 factory 函数创建 |
| `container` | `HTMLElement` | 快捷方式，等同于 `createBrowserViewerHost(container)` |
| `iframe` | `HTMLIFrameElement` | 快捷方式，等同于 `createIframeViewerHost(iframe)` |
| `fontProvider` | `FontProvider` | 自定义字体加载器 |

## ViewerHost

Host 决定 Viewer 在哪里渲染。三种模式：

### Browser Host

直接渲染到当前页面的 DOM 容器中。

```ts
import { createBrowserViewerHost, createViewer } from '@easyink/viewer'

const host = createBrowserViewerHost(document.getElementById('viewer-root'))
const viewer = createViewer({ host })
```

### Iframe Host

渲染到 iframe 内部，实现样式和脚本完全隔离。**推荐方式**。

```ts
import { createIframeViewerHost, createViewer } from '@easyink/viewer'

const host = createIframeViewerHost(iframeElement)
const viewer = createViewer({ host })
```

### Custom Host

完全自定义 document、window、mount 点和打印行为。

```ts
import { createCustomViewerHost, createViewer } from '@easyink/viewer'

const host = createCustomViewerHost({
  document: myDocument,
  window: myWindow,
  mount: myRootElement,
  print: () => { /* 自定义打印逻辑 */ },
})
const viewer = createViewer({ host })
```

## ViewerRuntime API

### open(input)

打开文档，触发完整的渲染流程。

```ts
await viewer.open({
  schema: documentSchema,           // DocumentSchema
  data: { title: 'Hello' },        // 运行时数据
  dataSources: [...],               // 数据源描述符
  onDiagnostic: (event) => {       // 诊断事件回调
    console.warn(`[${event.severity}] ${event.code}: ${event.message}`)
  },
})
```

渲染流程：字体加载 -> 数据绑定 -> 元素测量 -> 分页规划 -> DOM 渲染。

### render()

手动触发重新渲染，返回渲染结果。

```ts
const result = await viewer.render()
// result.pages     -- 页面信息数组
// result.thumbnails -- SVG 缩略图数组
// result.diagnostics -- 诊断事件数组
```

### updateData(data)

更新数据并重新渲染。

```ts
await viewer.updateData({ title: 'Updated Title' })
```

### print(options)

打印当前文档。

```ts
await viewer.print({
  driverId: 'browser',           // 打印驱动 ID
  pageSizeMode: 'driver',        // 'driver'（按打印机介质）或 'fixed'（按模板尺寸）
  throwOnError: true,
  onPhase: (event) => { /* 阶段回调 */ },
  onProgress: (progress) => { /* 进度回调 */ },
  onDiagnostic: (event) => { /* 诊断回调 */ },
})
```

### exportDocument(options)

导出文档为 Blob。

```ts
const blob = await viewer.exportDocument({
  format: 'pdf',
  entry: 'preview',
  throwOnError: true,
  onPhase: (event) => { /* 阶段回调 */ },
  onProgress: (progress) => { /* 进度回调 */ },
})
```

### destroy()

销毁运行时，清理所有状态和 DOM。

```ts
viewer.destroy()
```

## 注册扩展

### 自定义物料渲染器

```ts
viewer.registerMaterial('my-widget', {
  render(node, context) {
    return { html: '<div class="my-widget">...</div>' }
  },
  measure(node, context) {
    return { width: node.width, height: 100 }
  },
  pageAware: false,
})
```

### 自定义导出插件

```ts
viewer.registerExporter({
  id: 'my-pdf-exporter',
  format: 'pdf',
  async export(context) {
    // context.renderedPages -- 已渲染的页面 DOM
    // context.container    -- 容器元素
    // context.schema       -- 文档 Schema
    // context.data         -- 运行时数据
    return blob // 返回 Blob
  },
})
```

### 自定义打印驱动

```ts
viewer.registerPrintDriver({
  id: 'thermal-printer',
  async print(context) {
    // context.renderedPages -- 已渲染的页面 DOM
    // context.printPolicy   -- 打印策略
    // context.container     -- 容器元素
  },
})
```

## 数据绑定

Viewer 在渲染时自动解析 Schema 中的数据绑定。绑定通过 `BindingRef` 引用数据源中的字段路径。

```ts
// Schema 中的元素绑定示例
{
  type: 'text',
  props: { content: '默认文本' },
  binding: {
    sourceId: 'order',
    path: 'customerName',
  },
}
```

渲染时，Viewer 会将 `data.customerName` 的值替换到元素的 `content` 属性上。

## 诊断系统

Viewer 通过统一的诊断机制报告问题，不会静默吞掉错误。

```ts
await viewer.open({
  schema,
  data,
  onDiagnostic: (event) => {
    // event.category  -- 'schema' | 'datasource' | 'font' | 'material' | 'print' | 'exporter'
    // event.severity  -- 'warning' | 'error'
    // event.code      -- 错误码
    // event.message   -- 可读消息
    // event.nodeId    -- 关联的元素 ID（可选）
  },
})
```

## CSS 引入

如果使用 `@easyink/viewer` 独立渲染（不通过 Designer），需要确保页面有基础样式。Viewer 的 DOM 结构使用 `ei-viewer-page` 和 `ei-viewer-element` 作为 CSS 类名。
