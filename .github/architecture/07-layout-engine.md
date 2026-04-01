# 7. 布局引擎

## 7.1 坐标推移布局模型

EasyInk 不再区分传统意义上的 `absolute` 与 `flow` 两套 DSL。所有物料都存储明确的坐标和尺寸，但布局引擎在渲染时会基于 **y 坐标排序 + 累积高度差** 对后续物料做整体下推。

核心语义：

- 每个物料都拥有基础坐标 `x / y`。
- 默认情况下，内容变高的物料会把其后方物料整体向下推。
- “后方”按 `y` 坐标升序判定；若 `y` 相同，则按 `materials` 数组顺序判定。
- 推移不区分左右列，只要位于后方，就整体下移。
- 需要固定不动的物料必须显式标记为位置锁定，否则默认参与推移。
- 不支持自动分页，也不支持纸张自动延长。

```
┌─────────────────────────────────────┐
│  Page                               │
│  ┌────────────────────────────────┐ │
│  │  y=20   标题                    │ │
│  │  y=40   数据表格（高度增长）      │ │
│  │  y=90   签名区  ──被整体下推──▶  │ │
│  │  y=110  备注区  ──被整体下推──▶  │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 7.2 布局计算流程

```typescript
class LayoutEngine {
  constructor(options?: LayoutEngineOptions)

  /**
   * 1. 解析页面尺寸和内容区域
   * 2. 按 y 坐标升序对物料排序
   * 3. 处理 auto 尺寸：width auto → 内容区宽度，height auto → 估算值 + needsMeasure
   * 4. 对未锁定物料应用前序累计 delta，得到最终 y
   * 5. 计算旋转后的 bounding box
   * 6. 统计内容底部并给出 overflow 诊断
   */
  calculate(schema: TemplateSchema, data?: Record<string, unknown>): LayoutResult

  resolvePageDimensions(page: PageSettings): { width: number, height: number }

  resolveAutoHeight(material: MaterialNode, contentArea: ContentArea, data?: Record<string, unknown>): { height: number, needsMeasure: boolean }

  computeBoundingBox(x: number, y: number, w: number, h: number, rotation?: number): BoundingBox
}

const PAPER_SIZES: Record<string, { width: number, height: number }>

interface LayoutEngineOptions {
  /** auto height 元素的默认估算高度（页面单位，默认 30） */
  defaultAutoHeight?: number
}

interface LayoutResult {
  elements: Map<string, ComputedLayout>
  /** 内容实际底部位置 */
  contentBottom: number
  /** 是否超出声明纸张高度 */
  overflowed: boolean
}

interface ComputedLayout {
  x: number
  y: number
  width: number
  height: number
  boundingBox: { x: number, y: number, width: number, height: number }
  needsMeasure: boolean
  /** 应用到该物料的累计推移量 */
  deltaY: number
}
```

## 7.3 锁定位置语义

- 位置锁定是布局语义，不等同于设计器中的编辑锁定。
- 位置锁定物料保留声明坐标，不受前序动态高度影响。
- 典型适用场景：页头徽标、背景章、固定角标。
- 不建议对需要“贴底”语义的业务使用位置锁定，因为引擎不提供底部锚定模型。
