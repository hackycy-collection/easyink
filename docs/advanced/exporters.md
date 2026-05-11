# 自定义导出插件开发

导出插件将 Viewer 渲染后的页面转换为文件（如 PDF、图片等）。EasyInk 的导出分为两层：Viewer 层注册导出器，ExportRuntime 层执行实际的格式转换。

## 两层架构

```
Viewer (viewer.exportDocument)
    |
    v
ViewerExporter (格式适配层)
    |
    v
ExportRuntime + ExportFormatPlugin (实际转换层)
```

- **ViewerExporter**：注册在 Viewer 上，负责从渲染容器中提取页面 DOM 并传递给 ExportRuntime
- **ExportFormatPlugin**：注册在 ExportRuntime 上，负责实际的格式转换（如 DOM -> PDF）

## ViewerExporter 接口

```ts
import type { ViewerExporter } from '@easyink/viewer'

interface ViewerExporter {
  id: string
  format: string
  prepare?: (context: ViewerExportContext) => Promise<void>
  export: (context: ViewerExportContext) => Promise<Blob>
}
```

## ViewerExportContext

```ts
interface ViewerExportContext {
  schema: DocumentSchema
  data?: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
  entry: ExportEntry
  renderedPages?: ViewerPageMetrics[]
  container?: HTMLElement
  onPhase?: (event: ViewerTaskPhaseEvent) => void
  onProgress?: (event: ViewerTaskProgressEvent) => void
  onDiagnostic?: (event: ViewerDiagnosticEvent) => void
}
```

## ExportFormatPlugin 接口

```ts
import type { ExportFormatPlugin } from '@easyink/export-runtime'

interface ExportFormatPlugin<TInput = unknown, TResult = Blob> {
  id: string
  format: string
  validateInput?: (input: unknown) => input is TInput
  prepare?: (context: ExportRuntimeContext<TInput>) => Promise<void>
  export: (context: ExportRuntimeContext<TInput>) => Promise<TResult>
}
```

## 注册导出器

### 在 Viewer 上注册

```ts
viewer.registerExporter({
  id: 'my-pdf-export',
  format: 'pdf',
  async export(context) {
    const pages = Array.from(
      context.container?.querySelectorAll('.ei-viewer-page') ?? []
    )
    // 转换为 PDF Blob
    return await convertToPdf(pages)
  },
})
```

### 在 ExportRuntime 上注册

```ts
import { createExportRuntime } from '@easyink/export-runtime'

const exportRuntime = createExportRuntime()

exportRuntime.registerPlugin({
  id: 'my-pdf-plugin',
  format: 'pdf',
  async export(context) {
    // context.input -- 由 ViewerExporter 传入
    // context.reportProgress -- 进度报告
    // context.emitDiagnostic -- 诊断报告
    return pdfBlob
  },
})
```

## 完整示例：PDF 导出

结合 ViewerExporter 和 ExportRuntime 的典型模式：

```ts
import { createExportRuntime } from '@easyink/export-runtime'
import { createDomPdfExportPlugin } from '@easyink/export-plugin-dom-pdf'

// 1. 创建 ExportRuntime 并注册 PDF 插件
const exportRuntime = createExportRuntime()
exportRuntime.registerPlugin(createDomPdfExportPlugin())

// 2. 在 Viewer 上注册导出器，桥接到 ExportRuntime
viewer.registerExporter({
  id: 'pdf-export',
  format: 'pdf',
  async export(context) {
    const pages = Array.from(
      context.container?.querySelectorAll('.ei-viewer-page') ?? []
    )
    const firstPage = context.renderedPages?.[0]

    return exportRuntime.exportDocument({
      format: 'pdf',
      input: {
        pages,
        widthMm: firstPage?.width ?? 210,
        heightMm: firstPage?.height ?? 297,
      },
      throwOnError: true,
      onProgress: context.onProgress,
      onDiagnostic: (d) => context.onDiagnostic?.({
        category: 'exporter',
        severity: d.severity,
        code: d.code,
        message: d.message,
      }),
    })
  },
})

// 3. 调用导出
const blob = await viewer.exportDocument({
  format: 'pdf',
  entry: 'preview',
})
```

## 自定义格式示例

导出为自定义 JSON 格式：

```ts
viewer.registerExporter({
  id: 'json-export',
  format: 'template-json',
  async export(context) {
    const payload = {
      schema: context.schema,
      data: context.data,
      exportedAt: new Date().toISOString(),
    }
    return new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    )
  },
})

const blob = await viewer.exportDocument({ format: 'template-json' })
```

## ExportRuntime API

```ts
const runtime = createExportRuntime(options?)

// 注册插件
runtime.registerPlugin(plugin)

// 订阅状态变化
const unsubscribe = runtime.subscribe((state) => {
  // state.phase -- 'idle' | 'preparing' | 'exporting' | 'completed' | 'failed'
  // state.entry
  // state.format
  // state.error
})

// 执行导出
const blob = await runtime.exportDocument({
  format: 'pdf',
  input: myInput,
  throwOnError: true,
  onProgress: (p) => console.log(p),
  onDiagnostic: (d) => console.warn(d),
})
```

## 状态生命周期

```
idle -> preparing -> exporting -> completed
                \                /
                 -> failed <----
```

- `preparing`：调用插件的 `prepare` 方法
- `exporting`：调用插件的 `export` 方法
- `completed`：导出成功
- `failed`：导出失败，`state.error` 包含错误信息
