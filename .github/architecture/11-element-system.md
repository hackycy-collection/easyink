# 11. 物料体系

EasyInk 的物料体系要覆盖报表设计器里的“内容元素”和“结构元素”两类对象，而不是只围绕文本、图片这类基础块。第一轮文档已经明确了 `table / container / chart / svg / relation` 是一级类别，第二轮修订要把“一级类别”继续拆成真实可实现的目录和属性矩阵。

## 11.1 物料定义

每个物料都由四部分组成：

- Schema 定义
- Designer 交互定义
- Viewer 渲染定义
- 目录注册定义

```typescript
interface MaterialDefinition {
  type: string
  name: string
  icon: string
  category: MaterialCategory
  capabilities: MaterialCapabilities
  props: PropSchema[]
  createDefaultNode(input?: Partial<MaterialNode>): MaterialNode
}

interface MaterialCatalogEntry {
  id: string
  group: MaterialGroup
  label: string
  icon: string
  materialType: string
  useTokens?: string[]
  priority?: 'quick' | 'grouped'
}

interface MaterialCapabilities {
  bindable?: boolean
  rotatable?: boolean
  resizable?: boolean
  supportsChildren?: boolean
  supportsAnimation?: boolean
  supportsUnionDrop?: boolean
  pageAware?: boolean
  multiBinding?: boolean
}
```

## 11.2 目录层级

### 高频直达物料

- `line`
- `rect`
- `ellipse`
- `text`
- `image`
- `qrcode`
- `barcode`

### 数据目录

对标产品已经验证数据目录不是一个单一 `table-data` 入口，而是一整组面向报表、票据和运行时组件的物料簇。当前应按目录注册方式支持：

- `cell`
- `table-data`
- `table-free`
- `cell-free`
- `card-grid`
- `rich-text`
- `html`
- `background-image`
- `map`
- `progress`
- `formula`
- `function`
- `ruler`
- `bulk-text`
- `bulk-bwip`
- `bulk-qrcode`
- `bulk-barcode`
- `bulk-image`
- `rating`
- `heat`
- `radial-progress`
- `tag-cloud`
- `clock`
- `signature`
- `iframe`
- `conditional-image`
- `datetime`
- `signal-light`
- `alarm`
- `video`
- `weather`
- `number-adjuster`
- `pressure-button`
- `carousel`
- `link`
- `notice`
- `fan`
- `pdf`
- `serial-number`
- `page-number`
- `seal-span`
- `page-break`

### 图表目录

- `chart-line`
- `chart-gauge`
- `chart-bar`
- `chart-pie`
- `chart-funnel`
- `chart-radar`
- `chart-scatter`
- `chart-gauge-alt`
- `chart-water-ball`
- `chart-word-cloud`
- `chart-echarts`
- `chart-chartjs`
- `chart-mermaid`

### SVG 目录

- `svg-line`
- `svg-bezier-2`
- `svg-bezier-3`

### 关系图目录

- `relation-process`
- `relation-decision`
- `relation-start-end`
- `relation-data`
- `relation-document`
- `relation-subprocess`
- `relation-manual-input`
- `relation-page-ref`
- `relation-storage`
- `relation-card`
- `relation-manual-op`
- `relation-parallel`
- `relation-prepare`
- `relation-database`
- `relation-external-data`
- `relation-queue-data`
- `relation-band`
- `relation-cross-page-ref`

结论：

- `chart / svg / relation` 在架构上不是一个物料，而是目录型系统
- v1 不必把所有子物料全部做完，但物料注册体系必须一开始就能容纳它们

## 11.3 一等公民物料

以下物料必须按一级系统建设，而不是当成普通盒子补丁处理。

### `table-data`

它需要：

- 集合字段绑定
- 单元格绑定
- 表头编辑
- 分页切片
- 重复头
- 合计区
- 空行填充
- 递归子元素

### `container`

它需要：

- 子元素管理
- 局部坐标系
- 内部布局边界
- 分组选择和局部编辑

### `relation`

它需要：

- 节点关系描述
- 锚点
- 连线和标签
- 结构性编辑

### `chart`

它需要：

- 主数据源绑定
- 图表类型切换
- 图表库适配层
- 与 Viewer 导出路径兼容的静态快照或运行时渲染策略

## 11.4 属性系统

属性系统通过 `PropSchema` 驱动，但不能只停留在一个抽象接口。至少核心物料要有明确属性矩阵。

```typescript
interface PropSchema {
  key: string
  label: string
  type: PropSchemaType
  group?: string
  default?: unknown
  enum?: Array<{ label: string; value: unknown }>
  min?: number
  max?: number
  step?: number
  properties?: PropSchema[]
  items?: PropSchema
  visible?: (props: Record<string, unknown>) => boolean
  disabled?: (props: Record<string, unknown>) => boolean
  editor?: string
  editorOptions?: Record<string, unknown>
}
```

### 所有物料的公共属性组

- 几何：`x / y / width / height / rotation / alpha`
- 可见性：`hidden / locked / print`
- 元数据：`name / help / diagnostics`

### 文本物料属性矩阵

文本物料不是只有 `content + fontSize`。当前至少要有：

- 内容：内容、绑定字段、显示格式
- 绑定辅助：快捷前缀、快捷后缀
- 文本行为：富文本、自动换行、溢出省略、幽灵展示、自动分页
- 排版：字号、字体、行高、字间距、排列
- 颜色：文字颜色、背景颜色、黑白模式
- 边框：边框宽度、边框颜色、边框类型
- 元信息：帮助链接、元素名称、隐藏、锁定

### 表格物料属性矩阵

表格物料至少要拆成三层属性：

- 表级属性：格子均分、边框外观、格子间距、边框宽度、边框类型、边框颜色
- 区段属性：标题区、表头区、数据区、合计区、尾部区的显隐与重复规则
- 单元格属性：跨度、边框、内边距、内容元素、绑定规则

### 目录型物料的属性策略

- `chart/*` 子物料共享图表基类属性，再叠加图表类型专属属性
- `svg/*` 子物料共享路径/描边/填充基类属性
- `relation/*` 子物料共享节点外观、锚点和连接器属性

## 11.5 绑定能力

物料的绑定能力按类型划分：

### 单值绑定

- `text`
- `image`
- `barcode`
- `qrcode`
- `datetime`

### 结构绑定

- `table-data`
- `chart/*`
- `relation/*`
- `carousel`

### 多参数绑定

- `barcode`
- `formula`
- `function`
- 其他声明了 `multiBinding` 的物料

### 非绑定物料

- `rect`
- `line`
- `ellipse`
- 多数纯装饰图形

## 11.6 Designer 扩展面

每个物料包可提供 Designer 扩展：

```typescript
interface MaterialDesignerExtension {
  getToolbarActions?(node: MaterialNode): ToolbarAction[]
  getContextActions?(node: MaterialNode): ContextAction[]
  renderOverlay?(node: MaterialNode, state: DesignerMaterialState): unknown
  enterEditMode?(node: MaterialNode): boolean
}
```

对于结构物料，还需要支持：

- 局部选区
- 子树结构树映射
- 专属快捷键和右键菜单

## 11.7 Viewer 扩展面

每个物料包可提供 Viewer 渲染扩展：

```typescript
interface MaterialViewerExtension {
  render(node: MaterialNode, context: ViewerRenderContext): ViewerRenderOutput
  measure?(node: MaterialNode, context: ViewerMeasureContext): ViewerMeasureResult
}
```

对目录型物料的要求：

- 目录项不能只影响 Designer 菜单，它必须最终映射到可渲染的 `materialType`
- Viewer 需要能根据 `materialType` 精确找到扩展实现

## 11.8 未知物料策略

当模板中出现未知物料时：

- Designer 不直接删除
- 画布显示占位块
- 属性面板显示只读基础信息
- Viewer 输出诊断和明显占位
- 导入导出时尽量保留原始节点

## 11.9 v1 与完整对标范围

当前不应把“架构支持的完整目录”与“v1 先做哪些物料”混为一谈。

### 架构必须支持的完整范围

- 快捷物料条
- 数据目录
- 图表目录
- SVG 目录
- 关系图目录

### v1 实现优先级

1. `text`、`image`、`barcode`、`qrcode`
2. `table-data`、`table-static`
3. `container`
4. `chart/*`、`svg/*`、`relation/*` 的基础注册和少量代表性实现

这意味着物料体系要优先保证报表、票据、标签、多区域模板的主路径可用，同时不把目录架构做死在少量基础物料上。
