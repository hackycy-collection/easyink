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
/**
 * 创建渲染器实例
 * 所有内置物料渲染函数已自动包含，消费者无需手动注册。
 */
function createRenderer(options?: RendererOptions): Renderer

interface RendererOptions {
  /** 字体提供者（可选） */
  fontProvider?: FontProvider
}

interface Renderer {
  readonly name: string

  /**
   * 将 Schema 渲染到目标容器。
   * data 必须已经是展示值数据，不在渲染期做模板动态计算、格式化和条件计算。
   *
   * 内部流程：
   * 1. 加载字体和图片资源（单个失败不阻断，通过 onDiagnostic 通知）
   * 2. 离屏 DOM 测量（获取 auto-height 物料的真实尺寸）
   * 3. 布局计算（基于真实尺寸做推移）
   * 4. 最终 DOM 渲染（一次性生成）
   */
  render(
    schema: TemplateSchema,
    data: Record<string, unknown>,
    container: HTMLElement,
    options?: RenderCallOptions,
  ): Promise<RenderResult>

  destroy(): void
}

interface RenderCallOptions {
  /** 诊断回调，渲染过程中逐条发出 */
  onDiagnostic?: (event: RenderDiagnosticEvent) => void
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

interface RenderDiagnosticEvent {
  type: 'schema' | 'data' | 'material' | 'resource' | 'layout'
  severity: 'warning' | 'error'
  code: string
  message: string
  materialId?: string
  path?: string
  phase: 'load' | 'resolve' | 'layout' | 'render'
}
```

### 6.2.1 诊断通道

- diagnostics 通过 `render()` 参数中的 `onDiagnostic` 回调逐条发出。
- 事件按渲染过程逐条发出，便于上层应用实时写日志、在打印前阻断或映射为 UI 提示。
- `render()` 返回值继续聚焦 DOM 页面节点与测量结果，避免把可观测性和 DOM 结果耦合成一个大对象。
- 上层应用如需批量收集，可自行在 onDiagnostic 回调中缓存事件。

### 6.2.2 两阶段渲染流程

render() 内部采用两阶段流程解决 auto-height 估算偏差问题：

```
第一阶段（离屏测量）：
1. 创建 visibility:hidden + position:absolute 的隶屏容器
2. 将所有 auto-height 物料渲染到隶屏容器中
3. 读取真实 DOM 尺寸
4. 移除隶屏容器

第二阶段（最终渲染）：
1. 用真实尺寸执行 LayoutEngine.calculate()
2. 基于最终布局结果一次性生成最终 DOM
3. 插入目标 container
```

此流程避免了两趟全量 DOM 操作，第一阶段只渲染需要测量的物料。

### 6.2.3 样式隔离策略

渲染器采用局部 `<style>` + 哈希前缀 + 内联样式的混合策略，不使用 Shadow DOM（因为 Shadow DOM 在 html-to-image、Puppeteer 和 window.print 场景下存在兼容性问题）：

- **布局相关属性**（position/transform/width/height）：通过 inline style 实现
- **基线规则**（border-collapse、word-wrap 等）：在 container 内插入一段带哈希前缀的 `<style>` 标签
- **打印样式**：自动注入 `@page { size: X{unit} Y{unit}; margin: 0 }` 规则，单位跟随 `page.unit`

设计器则使用 Shadow DOM 做样式隔离，因为设计器不需要支持打印场景。

### 6.2.4 CSS 单位策略

渲染器根据 `page.unit` 直出对应的 CSS 物理单位（mm -> `mm`、pt -> `pt`、inch -> `in`）：

```css
/* mm 模板的渲染产物 */
.ei-page-abc123 {
  width: 210mm;
  height: 297mm;
  position: relative;
}
.ei-material-abc123 {
  position: absolute;
  left: 15mm;
  top: 20mm;
  width: 50mm;
}

/* pt 模板的渲染产物 */
.ei-page-abc123 {
  width: 595.276pt;
  height: 841.89pt;
  position: relative;
}
.ei-material-abc123 {
  position: absolute;
  left: 42.52pt;
  top: 56.693pt;
  width: 141.732pt;
}
```

- CSS 物理单位让浏览器打印引擎直接处理物理尺寸映射，无需手动 DPI 换算
- CSS 值直接使用 schema 中存储的数值 + 单位后缀，不截断小数
- 屏幕预览的视觉尺寸可能与物理尺寸不一致，但打印精度是准确的；框架不做屏幕预览补偿
- 消费者使用 Puppeteer/Playwright 时需确保工具正确处理 CSS 物理单位
- 详细单位策略参见 [13-单位系统](./13-unit-system.md)

## 6.3 运行时边界

- 渲染器不内建打印适配器、PDF 生成器和图片导出器。
- 渲染器不负责业务数据装配，只消费已经准备好的展示值对象。
- 渲染器会暴露 `overflowed` 和测量结果，帮助业务方决定是否阻止打印或走自定义导出流程。
- 对于缺失字段、绑定类型不匹配、未知物料、缺少自定义编辑器等问题，运行时优先保持页面可渲染，并通过 `diagnostic` 事件逐条暴露非阻断问题。
- 单值绑定 resolve 为 `undefined` 时，渲染结果为空白，不回退静态 `props`。
- 运行时遇到未注册物料类型时，不直接跳过节点；应在原声明位置渲染明显的占位 DOM 块，并发出 `material` 类诊断，避免打印结果被误判为正常。
- 外部图片、背景图、字体等资源只保存引用。浏览器默认加载行为与失败语义被视为底层能力，框架不负责上传、缓存、离线或失效恢复。

## 6.4 渲染前数据准备

业务方应在调用渲染器前把原始业务数据转换为“可直接展示”的对象：

- 日期、金额、编号等先格式化成最终字符串
- 地址、姓名等先完成拼接
- 条码/二维码值先完成清洗
- 复杂对象先拍平成扁平字段或一层对象数组

```typescript
const preparedDisplayData = {
  orderNo: 'ORD-2024-001',
  amountText: '¥250.00',
  fullAddress: '北京市朝阳区朝阳路 1 号',
  barcodeValue: 'ORD2024001',
  orderItems: [
    { itemName: '商品A', itemQty: '2', itemAmount: '¥200.00' },
    { itemName: '商品B', itemQty: '1', itemAmount: '¥50.00' },
  ],
}

renderer.render(schema, preparedDisplayData, container)
```

## 6.5 业务侧组合方式

```typescript
import { createRenderer } from '@easyink/renderer'

const renderer = createRenderer({ fontProvider: myFontProvider })

const diagnostics: RenderDiagnosticEvent[] = []
const result = await renderer.render(schema, preparedDisplayData, container, {
  onDiagnostic: (event) => {
    diagnostics.push(event)
    console.warn(`[${event.phase}] ${event.code}`, event)
  },
})

if (result.overflowed) {
  // 业务侧自行决定：告警、阻止提交、允许打印、另走导出链路
}

// 业务侧如需 PDF / image：基于 result.page 自行组合 Puppeteer、Playwright、html-to-image 等方案

result.dispose()
renderer.destroy()
```
