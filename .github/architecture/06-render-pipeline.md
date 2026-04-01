# 6. 渲染管线

## 6.1 统一 DOM 渲染策略

EasyInk 当前只承诺一条渲染主线：`Schema + 展示值数据 -> DOM`。设计器画布和业务侧运行时共享同一套 DOM 渲染语义，设计器只是在 DOM 页面之上额外叠加交互层。

```
Schema JSON
    │
    ▼
┌──────────────┐    ┌──────────────┐
│ SchemaEngine │───▶│ DataResolver │── 简单字段绑定
└──────────────┘    └──────────────┘
    │
    ▼
┌──────────────┐
│ LayoutEngine │── 坐标推移计算
└──────────────┘
    │
    ▼
┌───────────────────┐
│    DOMRenderer    │── DOM 节点树生成（单页）
└───────────────────┘
    │
    ├──▶ 设计器画布（叠加交互层）
    └──▶ 业务运行时容器（由业务方继续打印/导出）
```

## 6.2 渲染器接口

```typescript
interface Renderer {
  readonly name: string

  /**
   * 将 Schema 渲染到目标容器。
   * data 必须已经是展示值数据，不在渲染期做表达式、格式化和条件计算。
   */
  render(schema: TemplateSchema, data: Record<string, unknown>, container: HTMLElement): RenderResult

  destroy(): void
}

interface RenderResult {
  /** 渲染产生的页面 DOM 节点 */
  page: HTMLElement
  /** 内容底部位置（页面单位） */
  contentBottom: number
  /** 是否超出声明纸张高度 */
  overflowed: boolean
  /** 销毁函数 */
  dispose: () => void
}
```

## 6.3 运行时边界

- 渲染器不内建打印适配器、PDF 生成器和图片导出器。
- 渲染器不负责业务数据装配，只消费已经准备好的展示值对象。
- 渲染器会暴露 `overflowed` 和测量结果，帮助业务方决定是否阻止打印或走自定义导出流程。

## 6.4 业务侧组合方式

```typescript
const result = renderer.render(schema, preparedDisplayData, container)

if (result.overflowed) {
  // 业务侧自行决定：告警、阻止提交、允许打印、另走导出链路
}

// 业务侧如需 PDF / image：基于 result.page 自行组合 Puppeteer、Playwright、html-to-image 等方案
```
