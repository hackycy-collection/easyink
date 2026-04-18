# 11. 物料体系

EasyInk 的物料体系覆盖”内容元素”和”结构元素”两类对象。`table / container / chart / svg / relation` 是一级类别。

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
  /** 拖拽 element 级 resize handle 时保持宽高比。 */
  keepAspectRatio?: boolean
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

### `table-static`

它需要：

- 固定行列拓扑，无 role 概念（所有行强制 `normal`）
- 任意方向合并与拆分单元格
- 格子尺寸和局部边框编辑
- 每个格子独立排版属性（`cell.typography`，回退到表级 `typography` 默认值）
- 格子内联内容编辑（深度编辑 content-editing 阶段，工具栏 + 属性面板设置文本属性）
- 独立数据源绑定（`cell.staticBinding`），每个 cell 可绑定不同 source 的字段，与手动编辑互斥

### `table-data`

它需要：

- Cell 级绝对路径绑定，repeat-template 行内各 cell 的 fieldPath 必须共享相同的集合前缀（Designer 拖拽时通过 `getFieldCollectionPrefix()` 校验）
- Row role 标记 (normal/header/footer/repeat-template)，header 和 footer 各强制单行（schema + 命令层双层强制）
- 头尾可见性控制（`showHeader` / `showFooter`），隐藏时 Viewer 完全不渲染对应行
- Header/footer/normal 行 cell 使用 `staticBinding`（与 table-static 共用同一机制）
- 表头/尾编辑：支持手动编辑或拖拽数据源，仅允许左右列方向合并
- 数据区编辑：设计态展示 3 行（1 行编辑区 + 2 行灰色占位），编辑区仅接受数据源绑定，不允许手动编辑和合并
- 数据区占位行：纯渲染层虚拟行，不存在于 schema，完全惰性不可交互
- Row 级 repeat：Viewer 运行时通过 `extractCollectionPath()` 从 repeat-template 行 cell 的 fieldPath 推导集合路径，按集合数据逐项重复

分页切片、重复头、合计区、空行填充由 Viewer/PagePlanner 负责，不属于 table-data 职责。Cell 仅包含文本内容，不支持子物料嵌套。

### 表格工具库

`table-kernel` 是纯工具库，提供 table-static 和 table-data 共享的纯函数：几何计算、拓扑合并/拆分、命中测试。两个表格物料直接 import 所需函数，table-kernel 不做抽象层、不做 re-export。

### 表格 capabilities

```
table-static:  rotatable=false, resizable=true, bindable=true, multiBinding=true
table-data:    rotatable=false, resizable=true, bindable=true, multiBinding=true
```

子路径编辑能力通过 plugin 注册 `selectionTypes: ['table-cell']` 与 view plugin 的 overlay 层渲染表达，不再通过独立的 deepEditing / FSM 协议或 capability 标志。详见 [§11.6](#116-designer-扩展面) 与 [22-editor-core](./22-editor-core.md)。

### 表格 DatasourceDropHandler 实现

table-data 和 table-static 均实现 `DatasourceDropHandler`（协议见 [§11.6.8](#1168-datasourcedrophandler)）：

**table-data**：
- `onDragOver`：`viewModel.hitTest(local)` -> 得到 cellPath -> `viewModel.rectOf(cellPath)`。repeat-template 行检查字段集合前缀一致性（`getFieldCollectionPrefix`），不一致返回 `rejected`；header/footer/normal 行直接 `accepted`。
- `onDrop`：repeat-template 行通过 `table/set-cell-binding` step（`kind: 'binding'`）写入绑定；header/footer/normal 行通过 `table/set-cell-binding` step（`kind: 'staticBinding'`）写入。

**table-static**：
- `onDragOver`：`viewModel.hitTest(local)`，无约束，直接 `accepted`。
- `onDrop`：`table/set-cell-binding` step（`kind: 'staticBinding'`）写入绑定。

ViewModel 内部复用 `@easyink/material-table-kernel` 的 `hitTestGridCell / resolveMergeOwner / computeCellRect` 纯函数。

### 深度编辑工具栏

table-static 和 table-data 使用独立的工具栏配置，不再共用：

**table-static 工具栏**：
- 插入行（上/下）、删除行
- 插入列（左/右）、删除列
- 合并右 / 合并下 / 拆分（任意方向均可用）
- 对齐（左/中/右/上/中/下）

**table-data 工具栏**（根据选中 cell 所在区域动态调整）：

Header/Footer 区域选中时：
- 插入列（左/右）、删除列
- 合并右 / 拆分（仅列方向）
- 对齐

数据区选中时：
- 插入列（左/右）、删除列
- 对齐
- 无合并/拆分、无手动编辑入口

### 数据区占位行渲染

table-data 的 ViewModel（`buildTableDataViewModel`）在 repeat-template 行下方派生出 2 行纯视觉占位区域：

- 占位行高度 = repeat-template 行的 `row.height`
- 占位行单元格边框/宽度克隆自 repeat-template 行对应 cell
- 占位行整体施加灰色半透明叠加层（如 `background: rgba(0,0,0,0.04)`）
- 占位行不出现在 `viewModel.hitRegions`，天然不可选中、不可编辑
- Schema 中 `element.height` 仅反映实际行（不含占位行），占位行仅影响 ViewModel 派生视觉高度
- Schema 不感知占位行：绝不在 hit-test / rectOf 计算里做手工 ±placeholder 高度的补丁

### 子路径编辑的通用交互模型

复杂物料的子路径编辑完全由 EditorCore 的 Selection + Plugin 机制承载：

1. **子路径 selection**：物料通过 `selectionTypes` 注册自定义 selection type（table-cell / container-child / relation-node），path 形状由物料自定义。
2. **Overlay 与 Toolbar 渲染**：view plugin 在 `ctx.layers.overlay / toolbar` 上 push 纯函数 VNode，由 Designer 通过 preact reconciler 统一挂载与定位。
3. **职责划分**：Designer 管理元素级选区框、对齐辅助、元素拖动、元素级 resize；物料 plugin 管理 content 渲染、子选区高亮、内部 resize 把手、浮动工具条。
4. **通信机制**：view plugin 的 `render(ctx)` 读 `ctx.state`，通过 `ctx.dispatch(tr)` 写；不存在命令式 delegate / emit / on。
5. **Extension 注册**：物料通过 `defineMaterial({ definition, plugins })` 注册 一组 Plugin。
6. **生命周期**：随 selection 自然进出——selection 指向物料子路径 → overlay/toolbar 自动出现；selection 离开 → 自动消失。无需 phase onEnter/onExit。
7. **互斥约束**：`state.selection` 天然单一，多选状态是独立 selection type（`element-range`），与子路径 selection 互斥。

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

表格物料属性按三层上下文组织：

- 表级属性：格子均分、边框外观、格子间距、边框宽度、边框类型、边框颜色、排版默认值（`typography`：字号、颜色、粗体、斜体、行高、字间距、对齐、垂直对齐）、头尾可见性（仅 table-data，`showHeader` / `showFooter`）
- 行属性：行角色（仅 table-data 显示）、行高
- 单元格属性：跨度、边框（四侧独立显示/隐藏，粗细/颜色/类型继承表级设置）、内边距、排版（`cell.typography`：字段缺失时显示表级默认值 + "重置为默认"按钮）、绑定字段（table-data repeat-template: `binding`，table-static 和 table-data header/footer: `staticBinding`）
- 内容属性：格子文本内容（仅无绑定时可编辑）、内联文本编辑入口

内容层不是另一套独立属性面板。它必须挂在表格壳层之下，避免编辑文字时丢失当前表格上下文。

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
- `table-static`（cell 级独立绑定，每 cell 可绑不同 source）

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

> 本节于 Editor Core 重构后整节重写。
> 物料不再提供 `MaterialDesignerExtension / DeepEditingDefinition / NodeSignal / delegate` 这些旧协议，改为通过 **`defineMaterial`** 组装一组 **Plugin**，由 EditorCore 统一调度。
> 完整协议、类型、示例见 [22-editor-core](./22-editor-core.md)。本节只陈述物料体系关心的 WHAT，不重复 HOW。

### 11.6.1 物料 = `MaterialDefinition` + `Plugin[]`

```typescript
interface MaterialDefinition {
  type: string
  name: string
  icon: string
  category: MaterialCategory
  capabilities: MaterialCapabilities
  props: PropSchema[]
  createDefaultNode: (input?: Partial<MaterialNode>) => MaterialNode
}

function defineMaterial(config: {
  definition: MaterialDefinition
  plugins: Plugin[]
}): MaterialRegistration
```

物料包对外导出一个 `MaterialRegistration`；宿主（playground / designer 消费方）通过 `editor.plugins` 注入即可完成注册。

### 11.6.2 Plugin 按职责分解

物料内部不要求实现一个巨型 extension，而是把能力拆成若干独立 Plugin（ProseMirror 风）。常见职责：

| Plugin | 职责 |
|--------|------|
| view plugin | `render(ctx)` 向 `ctx.layers.{content, overlay, toolbar, handles}` push 出 VNode |
| selection plugin | 通过 `selectionTypes` 注册自定义 selection type（如 `table-cell`） |
| step plugin | 通过 `stepTypes` 注册自定义 Step（如 `table/insert-row`） |
| keymap plugin | 处理 selection 上下文内的按键（如 Tab 切 cell） |
| propertyPanel plugin | 按 selection 返回 `PanelContribution[]` |
| drop plugin | 实现 `DatasourceDropHandler` |
| state plugin | 维护 plugin-local state slot（如 `editingCell` 纯文本草稿） |

职责可以合并到同一 Plugin 对象中，也可以拆分成多个 Plugin 对象，自由组合。dependencies 字段显式声明依赖（如 keymap 依赖 state）。

### 11.6.3 设计态渲染（Design-time Rendering）

设计态渲染 = view plugin 往 `ctx.layers.content` push 的 VNode 树。设计态与 Viewer 仍是两套独立实现，原因不变：

- 设计态不执行数据绑定解析，绑定值显示为字段标签（如 `{#订单编号}`）
- 设计态不执行分页、字体加载、数据源拉取
- 复杂物料在设计态使用静态缩略图或简化占位，不引入第三方渲染库
- 设计态响应编辑交互（悬停、选中、编辑态样式变化）
- 设计态渲染运行在主线程，必须轻量快速

**渲染方式**：view plugin 是**纯函数** —— `render(ctx)` 读 `ctx.state`，往 `ctx.layers` push VNode。**禁止** 闭包可变状态；DOM 副作用（focus/select/滚动）必须通过 `ref / onMount / onCleanup` 回调完成。

preact 的 `h` / `Fragment` / `onMount` / `onCleanup` 由 `@easyink/core/view` 薄封装 re-export，extension 不直接依赖 preact：

```typescript
import { h, Fragment, onMount } from '@easyink/core/view'
```

**各类物料的设计态渲染策略**（不变）：

| 物料类别 | 设计态渲染 | 与 Viewer 的差异 |
|---|---|---|
| text | 根据 props 渲染文字样式；绑定值显示为 `{#字段标签}` | Viewer 替换为真实数据 |
| image | 有 src 时显示缩略图，无 src 时显示图标占位 | 无差异 |
| barcode / qrcode | 显示静态示意图 + 值标签 | Viewer 调用渲染库生成真实码 |
| line / rect / ellipse | 根据 props 直接渲染图形 | 基本无差异 |
| table-static | 渲染表格格线结构和格子内容；有 staticBinding 的 cell 显示 `{#字段标签}` | Viewer 替换为真实数据 |
| table-data | 渲染表格格线结构；header/footer 显示文本或绑定标签；数据区编辑行显示绑定标签，下方 2 行灰色占位（由 ViewModel 产出） | Viewer 执行数据展开、分页、重复头 |
| container | 渲染容器边界 + 递归渲染子元素 | 基本无差异 |
| chart | 显示图表类型图标 + 静态缩略图占位 | Viewer 调用图表库 |
| svg | 直接渲染 SVG 内容 | 基本无差异 |
| relation | 显示关系类型图标 + 结构占位 | Viewer 渲染完整连线和锚点 |

**回退策略**：

- 物料未注册 view plugin → 画布显示类型名占位块
- 未知物料始终显示诊断占位，不静默消失

**画布调用流程**：

```
EditorView raf tick
  → reconcile(state):
      for each plugin in topological order:
        plugin.view?.render(ctx) // ctx.layers.* 由 core 按 node 维度分配
  → 合并得到页面级 VNode 树
  → preact.render(vnodeTree, canvasMount)
```

Canvas 层内部不使用 Vue 响应式。

### 11.6.4 ViewModel：结构物料的视觉派生层

结构物料（table / container）**必须**提供 ViewModel（`buildViewModel(node) => { rows, cells, hitRegions, rectOf, hitTest, extras }`）。

ViewModel 负责：

- 把 Schema topology 展开为"逻辑行/列/单元格"流
- 生成设计态专有视觉元素（如 table-data 的 2 行灰色占位行；container 的空 slot 占位）
- 提供 `hitTest(local)` 与 `rectOf(path)`，供 Designer 的 pointer 层和 view 层共用

**Schema 不感知设计态占位**。旧实现里 `computeCellRectWithPlaceholders` / `hitTestWithPlaceholders` 的手工 ±placeholder 高度全部移除，占位逻辑完全收束在 `buildTableDataViewModel` 内部。

### 11.6.5 Selection 扩展

子路径选区通过 selection plugin 注册：

```typescript
// 表格：注册 table-cell 类型
selectionTypes: [{
  type: 'table-cell',
  fromJSON(json) { /* ... */ },
}]
```

子路径 path 形状由物料自行定义（如 `[row, col]`）。Designer 层仅通过 `selection.type / nodeId` 识别所属物料，内部 path 对 Designer 透明。

"深度编辑"不再是一个独立概念，它就是画布当前 selection.type 指向物料内部子路径时的视觉约定。详见 [§10.7](./10-designer-interaction.md)。

### 11.6.6 Step 扩展（结构性修改）

物料负责的拓扑级修改（插入行列、合并、resize 等）通过自定义 Step 注册：

```typescript
stepTypes: [
  TableInsertRowStep,
  TableRemoveRowStep,
  TableInsertColStep,
  // ...
]
```

每个 Step 必须实现 `apply / invert / getMap / toJSON`。core 负责 transaction 组合、mapping 连缀与 history invert；物料不再维护 Command 类。

通用字段修改走 core 提供的通用 step（`set-prop / patch-array` 等），不需要物料自定义。

### 11.6.7 Commands（语义化 tx 工厂）

Plugin 通过 `commands: Record<string, CommandFactory>` 暴露语义命令（如 `insertRowBelow`、`mergeCells`、`resizeColumn`）。UI / keymap / 测试统一通过 commands 发起变更，从不手写 Step。

```typescript
const tr = tableCommands.insertRowBelow(editor.state, { nodeId, row })
if (tr) editor.dispatch(tr)
```

### 11.6.8 DatasourceDropHandler

```typescript
interface DatasourceDropHandler {
  onDragOver: (ctx: DropContext) => DropZone | null
  onDrop: (ctx: DropContext) => void
}

interface DropContext {
  state: EditorState
  dispatch: (tr: Transaction) => void
  field: DatasourceFieldInfo
  local: { x: number, y: number }
  node: MaterialNode
}

interface DropZone {
  status: 'accepted' | 'rejected'
  rect: { x: number, y: number, w: number, h: number }
  label?: string
}

interface DatasourceFieldInfo {
  sourceId: string
  sourceName: string
  sourceTag: string
  fieldPath: string
  fieldKey: string
  fieldLabel: string
  use?: string
}
```

`onDrop` 由 plugin 自行构造 Transaction 并 dispatch（`setSetBinding / setCellStaticBinding / insert-node` 等）。未实现 dropHandler 的物料回退到"整个元素 drop zone + 写 `node.binding` 单值绑定"。

### 11.6.9 属性面板贡献

plugin 的 `propertyPanel(ctx)` 按当前 selection 返回 `PanelContribution[]`。纯函数，无 push、无漏推，随 undo 自动回放。详见 [§10.5 属性面板贡献](./10-designer-interaction.md) 与 [§22.11](./22-editor-core.md)。

### 11.6.10 右键菜单

右键菜单由 Designer 统一管理（`CanvasContextMenu`），提供通用操作（复制/剪切/粘贴/克隆/删除/层级/锁定）。物料不参与右键菜单注册；物料特有的操作应通过子选区 + toolbar 或属性面板暴露。

### 11.6.11 结构物料的额外职责

对表格 / container / relation 这类结构物料，还要求：

- 实现子路径 selection type（table-cell / container-child / relation-node ...）
- 实现 ViewModel（hitRegions、rectOf、hitTest）
- 实现结构性自定义 Step + invert
- view plugin 在 `overlay` 层渲染子选区高亮与内部 handle；在 `toolbar` 层渲染浮动工具条
- keymap 处理子选区相关按键（Tab / Enter / Delete / Arrow）

表格特有：

- 表壳、格子、格子内容三层属性 contribution 在 order 50-79 区间分别注册
- 格子内纯文本编辑通过 plugin state slot `editingCell` 管理草稿（纯文本内容字段），commit 时构造 `table/update-cell` step

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
