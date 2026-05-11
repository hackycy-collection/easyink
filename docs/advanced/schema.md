# Schema 参考

Schema 是 EasyInk 的核心数据结构，描述文档的完整结构。它是设计器和预览器之间的唯一桥梁。

## DocumentSchema

```ts
interface DocumentSchema {
  version: string                    // Schema 版本号
  meta?: DocumentMeta                // 文档元信息
  unit: UnitType                     // 全局单位：'mm' | 'cm' | 'in' | 'pt' | 'px'
  page: PageSchema                   // 页面配置
  guides: GuideSchema                // 辅助线
  elements: MaterialNode[]           // 元素列表
  groups?: ElementGroupSchema[]      // 元素分组
  extensions?: Record<string, unknown> // 扩展数据（如 AI、自定义插件）
  compat?: BenchmarkCompatState      // 兼容层数据
}
```

## DocumentMeta

```ts
interface DocumentMeta {
  name?: string
  description?: string
  author?: string
  createdAt?: string
  updatedAt?: string
}
```

## PageSchema

页面配置定义纸张尺寸、分页模式和打印参数。

```ts
interface PageSchema {
  mode: PageMode            // 'fixed' | 'stack' | 'label'
  width: number             // 页面宽度
  height: number            // 页面高度
  pages?: number            // 页数（fixed 模式）
  scale?: PageScale         // 缩放模式
  radius?: string           // 页面圆角
  offsetX?: number          // 水平偏移
  offsetY?: number          // 垂直偏移
  copies?: number           // 打印份数
  blankPolicy?: BlankPolicy // 空白页策略
  label?: LabelPageConfig   // 标签页配置
  grid?: GridConfig         // 网格配置
  font?: string             // 默认字体
  background?: PageBackground // 页面背景
  print?: PagePrintConfig   // 打印配置
  extensions?: Record<string, unknown>
}
```

### 分页模式

| 模式 | 说明 |
|------|------|
| `fixed` | 固定页面，元素绝对定位，支持多页 |
| `stack` | 堆叠流式，元素按 Y 轴排列，自动分页 |
| `label` | 标签模式，多列多行网格布局 |

### LabelPageConfig

标签模式的网格配置：

```ts
interface LabelPageConfig {
  columns: number    // 列数
  gap: number        // 列间距
  rows?: number      // 行数
  rowGap?: number    // 行间距
}
```

### PageBackground

```ts
interface PageBackground {
  color?: string           // 背景颜色
  image?: string           // 背景图片 URL
  repeat?: BackgroundRepeat // 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
  width?: number
  height?: number
  offsetX?: number
  offsetY?: number
}
```

### PagePrintConfig

```ts
interface PagePrintConfig {
  orientation?: 'auto' | 'portrait' | 'landscape'
  horizontalOffset?: number  // 打印水平偏移
  verticalOffset?: number    // 打印垂直偏移
}
```

### GridConfig

```ts
interface GridConfig {
  enabled: boolean
  width: number   // 网格单元宽度
  height: number  // 网格单元高度
}
```

## MaterialNode

元素节点是文档中的可视对象。

```ts
interface MaterialNode<TProps = Record<string, unknown>> {
  id: string                   // 唯一标识
  type: string                 // 物料类型（如 'text'、'image'、'table-data'）
  name?: string                // 显示名称
  unit?: UnitType              // 坐标单位（覆盖全局 unit）
  x: number                    // X 坐标
  y: number                    // Y 坐标
  width: number                // 宽度
  height: number               // 高度
  rotation?: number            // 旋转角度
  alpha?: number               // 透明度（0-1）
  zIndex?: number              // 层级
  hidden?: boolean             // 是否隐藏
  locked?: boolean             // 是否锁定
  print?: PrintBehavior        // 打印行为
  props: TProps                // 物料属性（由物料类型决定）
  binding?: BindingRef | BindingRef[]  // 数据绑定
  animations?: AnimationSchema[]       // 动画
  children?: MaterialNode[]    // 子元素（容器类物料）
  diagnostics?: NodeDiagnosticState[]  // 节点级诊断
  extensions?: Record<string, unknown>
  compat?: BenchmarkElementCompatState
}
```

### 常见物料类型

| type | 说明 | 主要 props |
|------|------|-----------|
| `text` | 文本 | `content`, `fontSize`, `fontFamily`, `color`, `textAlign`, `fontWeight` |
| `image` | 图片 | `src`, `objectFit` |
| `barcode` | 条码 | `value`, `format` |
| `qrcode` | 二维码 | `value` |
| `line` | 线条 | `direction`, `strokeColor`, `strokeWidth` |
| `rect` | 矩形 | `fill`, `strokeColor`, `strokeWidth` |
| `ellipse` | 椭圆 | `fill`, `strokeColor` |
| `table-static` | 静态表格 | `table: TableSchema` |
| `table-data` | 数据表格 | `table: TableDataSchema` |
| `container` | 容器 | `children` |
| `chart` | 图表 | 图表配置 |
| `svg` | SVG | SVG 内容 |

## BindingRef

数据绑定引用。

```ts
interface BindingRef {
  sourceId: string           // 数据源 ID
  sourceName?: string        // 数据源名称
  sourceTag?: string         // 数据源标签
  fieldPath: string          // 字段路径，如 'customer.name' 或 'items[].price'
  fieldKey?: string          // 字段 key
  fieldLabel?: string        // 字段标签
  format?: BindingDisplayFormat  // 格式化规则
  bindIndex?: number         // 绑定索引（多绑定时区分主/次）
  required?: boolean         // 是否必填
  extensions?: Record<string, unknown>
}
```

## AnimationSchema

```ts
interface AnimationSchema {
  trigger: string    // 触发条件
  type: string       // 动画类型
  duration?: number  // 持续时间（毫秒）
  delay?: number     // 延迟（毫秒）
  options?: Record<string, unknown>
}
```

## TableNode

表格元素扩展了 MaterialNode，增加了 `table` 属性。

```ts
interface TableNode extends MaterialNode {
  type: 'table-static' | 'table-data'
  table: TableSchema
}

interface TableSchema {
  kind: 'static' | 'data'
  topology: TableTopologySchema  // 行列拓扑
  layout: TableLayoutConfig      // 布局配置
  diagnostics?: LayoutDiagnostic[]
}

interface TableTopologySchema {
  columns: TableColumnSchema[]   // 列定义（ratio 为宽度比例）
  rows: TableRowSchema[]         // 行定义
}

interface TableRowSchema {
  height: number
  role: TableRowRole             // 'header' | 'body' | 'footer'
  cells: TableCellSchema[]
}

interface TableCellSchema {
  rowSpan?: number
  colSpan?: number
  content?: {
    text?: string
    elements?: MaterialNode[]    // 单元格内嵌元素
    editMode?: 'inline-text' | 'rich-text' | 'hosted'
  }
  binding?: BindingRef
  typography?: CellTypography
}
```

## 工具函数

```ts
// 类型守卫
isTableNode(node)      // 是否为表格节点
isTableDataNode(node)  // 是否为数据表格节点

// 属性访问
getNodeProps<T>(node)  // 获取类型化的 props
```

## 最小 Schema 示例

```json
{
  "version": "1",
  "unit": "mm",
  "page": {
    "mode": "fixed",
    "width": 210,
    "height": 297
  },
  "guides": { "x": [], "y": [] },
  "elements": [
    {
      "id": "text-1",
      "type": "text",
      "x": 20,
      "y": 20,
      "width": 170,
      "height": 10,
      "props": {
        "content": "Hello EasyInk",
        "fontSize": 24,
        "fontFamily": "sans-serif"
      }
    }
  ]
}
```
