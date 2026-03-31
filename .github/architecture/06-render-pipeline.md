# 6. 渲染管线

## 6.1 统一 DOM 渲染策略

所有渲染场景（设计器画布、打印预览、PDF 生成、图片导出）共享同一套 DOM 渲染代码。设计器在 DOM 渲染层之上叠加交互层。

```
Schema JSON
    │
    ▼
┌─────────────┐     ┌──────────────┐
│ SchemaEngine │────▶│ DataResolver │── 数据填充
└─────────────┘     └──────────────┘
    │                       │
    ▼                       ▼
┌──────────────┐    ┌──────────────┐
│ LayoutEngine │    │ Expression   │── 表达式求值
│              │    │ Engine       │
└──────────────┘    └──────────────┘
    │
    ▼
┌───────────────────┐
│   DOMRenderer     │── DOM 节点树生成（单页）
└───────────────────┘
    │
    ├──▶ 设计器画布（叠加交互层）
    ├──▶ 打印预览（iframe 隔离）
    ├──▶ PDF 生成（可插拔管线）
    └──▶ 图片导出（html-to-canvas）
```

## 6.2 渲染器接口

```typescript
/**
 * 渲染器接口 -- 所有输出适配器必须实现
 */
interface Renderer {
  /** 渲染器唯一标识 */
  readonly name: string

  /**
   * 将 Schema 渲染到目标容器（单页输出）
   * @param schema - 模板 Schema
   * @param data - 填充数据
   * @param container - 目标容器（DOM 元素或虚拟容器）
   */
  render(schema: TemplateSchema, data: Record<string, unknown>, container: HTMLElement): RenderResult

  /** 销毁渲染结果，清理资源 */
  destroy(): void
}

interface RenderResult {
  /** 渲染产生的页面 DOM 节点 */
  page: HTMLElement
  /** 实际渲染高度（auto-extend 模式下可能大于声明高度） */
  actualHeight: number
  /** 销毁函数 */
  dispose: () => void
}
```

## 6.3 多输出目标适配

```typescript
/** 屏幕预览渲染器 */
class ScreenRenderer implements Renderer { /* ... */ }

/** 打印适配器 -- 默认 iframe 隔离 */
class PrintAdapter {
  print(renderResult: RenderResult, options?: PrintOptions): Promise<void>
}

/** PDF 生成器 -- 可插拔 */
interface PDFGenerator {
  generate(renderResult: RenderResult, options?: PDFOptions): Promise<Blob | ArrayBuffer>
}

/** 图片导出器 */
class ImageExporter {
  export(renderResult: RenderResult, options?: ImageOptions): Promise<Blob>
}
```
