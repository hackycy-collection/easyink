# 自定义导出插件开发

这篇文档解决的是一个实际问题：当内置导出格式不够时，开发者应该把逻辑写在哪一层，才能既复用 Viewer 的渲染结果，又不把格式转换逻辑耦合进业务代码。

先说判断标准：

- 你只是想在页面上多一个“导出 PDF”按钮，优先复用已有导出插件。
- 你要导出一种新格式，或者接入公司内部转换服务，再进入这一层。

## 两层架构为什么存在

EasyInk 把导出拆成两层，不是为了设计得复杂，而是为了分清两个职责：

- `ViewerExporter` 只负责和 Viewer 打交道，拿到渲染结果。
- `ExportFormatPlugin` 只负责格式转换，不关心 Viewer 如何渲染页面。

```
Viewer (viewer.exportDocument)
    |
    v
ViewerExporter
    |
    v
ExportRuntime + ExportFormatPlugin
```

这层拆分的价值是：同一个格式插件既可以服务 Viewer，也可以服务服务端任务、批处理任务或其他非 Viewer 场景。

## 你该把代码写在哪一层

### 写在 `ViewerExporter` 的逻辑

- 从 `context.container` 拿 `.ei-viewer-page`
- 读取 `renderedPages` 尺寸
- 把 Viewer 的事件回调转发给 runtime
- 组装插件真正需要的输入对象

### 写在 `ExportFormatPlugin` 的逻辑

- DOM 转 PDF / 图片 / 其他二进制格式
- 调用远程转换服务
- 校验输入是否合法
- 输出最终 `Blob` 或其他结果对象

一个简单判断：如果逻辑还依赖 `.ei-viewer-page`、`entry`、`renderedPages`，它更应该属于 `ViewerExporter`；如果它只关心“输入数据长什么样，输出文件长什么样”，它应该属于格式插件。

## 先看两个核心接口

### `ViewerExporter`

```ts
import type { ViewerExporter } from '@easyink/viewer'

interface ViewerExporter {
  id: string
  format: string
  prepare?: (context: ViewerExportContext) => Promise<void>
  export: (context: ViewerExportContext) => Promise<Blob>
}
```

### `ExportFormatPlugin`

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

## 开发时的推荐顺序

不要从 Viewer 层直接开写。更稳的顺序是：

1. 先定义格式插件真正需要的输入结构。
2. 把这个输入结构喂给 `ExportFormatPlugin` 跑通。
3. 最后再写 `ViewerExporter` 去桥接 Viewer 上下文。

这样做的原因是，你先把“格式转换正确”这件事独立验证掉，再处理 Viewer 这一层的输入适配。

## 完整示例：给 Viewer 增加 PDF 导出

这是最典型的组合方式。

```ts
import { createExportRuntime } from '@easyink/export-runtime'
import { createDomPdfExportPlugin } from '@easyink/export-plugin-dom-pdf'

const exportRuntime = createExportRuntime()
exportRuntime.registerPlugin(createDomPdfExportPlugin())

viewer.registerExporter({
  id: 'pdf-export',
  format: 'pdf',
  async export(context) {
    const pages = Array.from(
      context.container?.querySelectorAll('.ei-viewer-page') ?? []
    )

    if (pages.length === 0)
      throw new Error('没有可导出的页面')

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
      onDiagnostic: (diagnostic) => context.onDiagnostic?.({
        category: 'exporter',
        severity: diagnostic.severity,
        code: diagnostic.code,
        message: diagnostic.message,
        detail: diagnostic.detail,
        cause: diagnostic.cause,
      }),
    })
  },
})

const blob = await viewer.exportDocument({
  format: 'pdf',
  entry: 'preview',
})
```

这里最关键的不是代码量，而是职责边界：`viewer.registerExporter()` 这一层没有做 PDF 实现，只是在桥接输入和输出。

## 示例：导出业务 JSON

如果你的目标不是 PDF，而是“把当前模板和数据快照导出去”，那完全没必要引入 `ExportRuntime`。

```ts
viewer.registerExporter({
  id: 'template-json-export',
  format: 'template-json',
  async export(context) {
    const payload = {
      schema: context.schema,
      data: context.data,
      entry: context.entry,
      exportedAt: new Date().toISOString(),
    }

    return new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    )
  },
})
```

这就是一个很好的反例：因为导出逻辑直接依赖 Viewer 的 schema 和 data，上这一层已经足够，没必要再额外抽 runtime 插件。

## 什么时候应该用 `prepare`

`prepare` 适合做那些“耗时但可复用”的准备动作，例如：

- 预加载字体
- 预热远程转换服务
- 拉取水印资源
- 做一次输入校验并提前失败

不适合放在 `prepare` 的事情：

- 真正的文件生成逻辑
- 只有一次导出会用到的临时变量拼接

原因是 `prepare` 的价值在于把失败前置，把重工作前置，而不是把主逻辑拆散。

## 诊断和进度如何设计才有用

一个开发者真正需要的不是“导出失败”四个字，而是知道失败发生在哪一层。

推荐把问题分成三类：

- `viewer`：页面未渲染、容器为空、没有页面节点
- `exporter`：Viewer 到 runtime 的桥接参数错误
- `runtime` 或具体格式：插件输入不合法、远程服务失败、文件生成失败

```ts
context.onDiagnostic?.({
  category: 'exporter',
  severity: 'warning',
  code: 'EMPTY_PAGE_LIST',
  message: '当前渲染容器中没有找到可导出的页面',
})
```

## `ExportRuntime` 最值得用的地方

`ExportRuntime` 并不是所有导出都必须经过的一层，但下面这些场景很适合引入它：

- 一个格式插件要被多个 Viewer 或多个入口复用
- 你需要订阅统一的导出状态
- 你要把导出格式插件化，支持动态注册

```ts
const runtime = createExportRuntime()

runtime.registerPlugin(plugin)

const unsubscribe = runtime.subscribe((state) => {
  console.log(state.phase)
})

const blob = await runtime.exportDocument({
  format: 'pdf',
  input: myInput,
  throwOnError: true,
})
```

## 状态生命周期

```
idle -> preparing -> exporting -> completed
                \                /
                 -> failed <----
```

如何理解这几个阶段：

- `preparing`：校验输入、预热资源、准备环境
- `exporting`：真正执行格式转换
- `completed`：结果已生成
- `failed`：任一阶段发生错误

## 一个更短的工程路径

如果你的需求只是“导出一种新格式”，最短路径通常不是先设计大而全的导出体系，而是：

1. 先把格式转换本身写成纯函数或插件。
2. 用一段固定输入把结果跑通。
3. 再接入 `ViewerExporter`。

这样你能更快定位问题到底在格式层还是 Viewer 层。
