# 22. Editor Core

> EasyInk 内核：状态-事务-插件的结构化编辑模型。
> 把"画布 + 深度编辑"统一成同一个 Editor，用 ProseMirror 式的模型替换旧的 Command + FSM 体系。

## 22.1 问题与动机

旧模型存在五个抽象失败：

1. **FSM 阶段容器化**：`DeepEditingDefinition` 的 phase 实质只是"一段生命周期"，phase 切换靠字符串；子选区（如 `selectedCell`）游离在 Schema 与 Store 外，Undo 后可能悬空。
2. **Delegate 膨胀**：表格一家给 Designer 定义了 15+ delegate 回调，每新增一个 cell 操作就要加一个方法，物料协议不收敛。
3. **命令类过度具体**：`InsertTableRowCommand`、`MergeTableCellsCommand` 等 10+ 表格命令堆在 `@easyink/core`，core 变成了物料知识的堆叠点。
4. **属性面板命令式推送**：`requestPropertyPanel(overlay)` 需要物料在 phase 进入、子选区变化、schema 更新时各自主动推送，容易漏推。
5. **抽象泄漏**：虚拟占位行要在 `hitTestWithPlaceholders` / `computeCellRectWithPlaceholders` 里手工 ±placeholder 高度，视觉模型和 Schema 没有分离。

**核心洞察**：这些问题的本质是"把 Editor 当成外壳 + 命令调度器"。真正的结构化编辑器（ProseMirror、CodeMirror、Lexical、Slate）都是**状态驱动**的：单一 EditorState 包含文档 + 选区 + 插件状态，唯一的修改路径是 Transaction，Plugin 通过状态派生 UI 与行为。EasyInk 要对标这个范式。

## 22.2 基本模型

```
            ┌──────────────────────────────────┐
            │           EditorState            │
            │  doc  selection  pluginStates    │
            └──────────────┬───────────────────┘
                           │ tr = state.tr...
                           ▼
                    ┌─────────────┐
                    │ Transaction │   (steps[], selection, meta)
                    └──────┬──────┘
                           │ dispatch(tr)
                           ▼
                    ┌─────────────┐
                    │  reducer    │   state.apply(tr) => newState
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌──────────┐      ┌─────────────┐    ┌──────────┐
  │  history │      │   view()    │    │  plugin  │
  │  (stack) │      │ pure render │    │  states  │
  └──────────┘      └─────────────┘    └──────────┘
                           │
                           ▼
                    raf-batched reconcile
                           │
                           ▼
                   preact h(...) => DOM
```

五条不可违反的约束：

1. **唯一写入路径**：任何改动都要走 `view.dispatch(tr)`；不允许直接改 `state.doc`、`state.selection`、`pluginStates`。
2. **状态纯数据**：`EditorState` 必须 JSON-serializable；不得包含 Node 引用、闭包、DOM 引用。
3. **View 纯函数**：`view(state, dispatch)` 对相同输入必须产出相同 VNode；DOM 副作用一律走 `ref / onMount / onCleanup`。
4. **Step 可逆**：每个 Step 提供 `invert(doc) => Step`；History 通过 invert 生成反向 Transaction 实现 undo。
5. **插件隔离**：每个 Plugin 拥有独立 state slot；外部只读，写入只能通过该 plugin 自己的 command。

## 22.3 术语与包边界

| 概念 | 说明 |
|------|------|
| `EditorState` | 不可变快照：`{ doc, selection, plugins }` |
| `Transaction` | 对 state 的一次原子变更描述 |
| `Step` | Transaction 内的最小变更单元，可 `apply / invert / mapSelection` |
| `Mapping` | 多个 Step 组合时的位置/选区映射 |
| `Selection` | 判别联合类型 `{ type: string, ... }`，由 plugin 注册子类型 |
| `Plugin` | 向 Editor 注入 state slot / view / keymap / propertyPanel / dropHandler |
| `MaterialExtension` | 基于若干 Plugin 组装出来的"一个物料的完整交互定义" |
| `ViewModel` | 物料对 Schema Node 的视觉派生结构（cells、rows、hitRegions） |

EditorCore 实现放在 `@easyink/core`（与 Schema 同包），对外导出 `EditorState / Transaction / Plugin / defineMaterial / ...`。旧的 `@easyink/core/commands/*`、`MaterialDesignerExtension`、`DeepEditingDefinition` 等 API 整体删除，不提供兼容层。

物料包布局：

```
@easyink/core                     ← EditorState/Transaction/Plugin/通用 Step
@easyink/material-table-kernel    ← 保留纯函数：geometry / topology / hit-test / typography / cell-schemas / render
@easyink/material-table-static    ← 独立 extension 包（defineMaterial + plugins）
@easyink/material-table-data      ← 独立 extension 包（defineMaterial + plugins）
@easyink/designer                 ← Vue 外壳，集成 EditorCore，把 state.view() 的 VNode 通过 preact 挂载到画布
```

## 22.4 EditorState

```typescript
export interface EditorState {
  readonly doc: DocumentSchema
  readonly selection: Selection
  readonly plugins: readonly Plugin[]
  /** Plugin state slot 按 plugin.key 索引，外部只读 */
  readonly pluginStates: ReadonlyMap<string, unknown>
  /** 创建起始 Transaction */
  readonly tr: Transaction
  /** 应用 tr，返回新 state */
  apply: (tr: Transaction) => EditorState
  /** 查询某 plugin 的 state */
  getPluginState: <T>(key: string) => T | undefined
}

export interface EditorStateConfig {
  doc: DocumentSchema
  selection?: Selection
  plugins: Plugin[]
}

export function createEditorState(config: EditorStateConfig): EditorState
```

`EditorState` 是**不可变**的，每次 `apply` 返回新实例。`DocumentSchema` 本身遵循 `@easyink/schema` 的规范模型，Editor 不引入额外语义。

### 序列化

```typescript
export function serializeEditorState(state: EditorState): string
export function deserializeEditorState(json: string, plugins: Plugin[]): EditorState
```

serialize 只落盘 `doc + selection + pluginStates`，不涉及 view / history（history 由 host 单独决定是否持久化）。这是协同预留的基础。

## 22.5 Selection

Selection 是判别联合类型。基类仅锁生命周期字段：

```typescript
export interface Selection {
  readonly type: string
  /** 所属物料节点 id；null 表示画布级选区（空选区） */
  readonly nodeId: string | null
  /** 内部子路径（物料自定义语义）；null 表示节点级选中 */
  readonly path: readonly unknown[] | null
  /** 把 selection 映射到应用 step 后的新文档坐标系 */
  map: (mapping: Mapping) => Selection
  /** JSON 序列化快照（必须完全可 JSON 化） */
  toJSON: () => SelectionJSON
}

export interface SelectionJSON {
  type: string
  nodeId: string | null
  path: readonly unknown[] | null
  [extra: string]: unknown
}
```

### 内置 Selection 类型

| 类型 | 说明 |
|------|------|
| `empty` | 空选区（画布空白） |
| `element` | 画布元素选中（对应旧 `SelectionState`，多选时 `ids` 放 path） |
| `element-range` | 多元素选区（v1 UI 只支持单选，但协议日起预留） |
| `<custom>` | 由物料注册，如 `table-cell`、`container-child`、`relation-node` |

### 自定义 Selection 注册

Plugin 通过 `registerSelection` 注册新 type，附带 reviver：

```typescript
export interface SelectionTypeSpec<T extends Selection> {
  type: string
  /** 从 JSON 反序列化回具体 Selection */
  fromJSON: (json: SelectionJSON, doc: DocumentSchema) => T
}
```

`table-cell` 的实现示例：

```typescript
interface TableCellSelection extends Selection {
  type: 'table-cell'
  nodeId: string
  path: readonly [row: number, col: number]
}

const tableCellSelectionSpec: SelectionTypeSpec<TableCellSelection> = {
  type: 'table-cell',
  fromJSON(json) {
    return {
      type: 'table-cell',
      nodeId: json.nodeId!,
      path: json.path as [number, number],
      map(mapping) { return mapping.mapSelection(this) },
      toJSON() { return { type: this.type, nodeId: this.nodeId, path: this.path } },
    }
  },
}
```

### 选区嵌套

嵌套路径（container > table > cell）不是特殊语义——每次深入一层就把上层的 `Selection` 保存到"历史栈"，新 Selection 覆盖当前。Esc 触发 `dispatch(popSelection())`，回退到栈顶。栈由 `selectionHistoryPlugin` 维护（可选）。v1 只用单层，栈长度 <= 1。

## 22.6 Transaction 与 Step

### Transaction

```typescript
export interface Transaction {
  readonly steps: readonly Step[]
  readonly selection: Selection
  readonly selectionSet: boolean
  readonly mapping: Mapping
  /** 运行时附加数据，不进 history，不落盘 */
  readonly meta: ReadonlyMap<string, unknown>

  // —— 构造器方法（返回新 Transaction，不可变） ——
  step: (step: Step) => Transaction
  setSelection: (selection: Selection) => Transaction
  setMeta: (key: string, value: unknown) => Transaction
  /** history 合并提示：当前 tr 若与前一 tr 同组，可合并成一条 undo 项 */
  scrollIntoView: () => Transaction
}
```

`tr.step(step)` 会立即把 step apply 到 `tr.docAfter`，并把 selection 通过 `mapping.mapSelection` 更新；因此构造 Transaction 的过程是累加的。

### Step

```typescript
export interface Step {
  /** 类型名；host 通过 stepType registry 反序列化 */
  readonly stepType: string
  /** 应用 step 到 doc，返回新 doc 与本 step 产生的 mapping */
  apply: (doc: DocumentSchema) => StepResult
  /** 生成反向 step（undo 使用） */
  invert: (doc: DocumentSchema) => Step
  /** 把一个选区/step 按本 step 导致的位移映射到 after 坐标系 */
  getMap: () => StepMap
  /** 序列化成 JSON */
  toJSON: () => { stepType: string, [k: string]: unknown }
}

export interface StepResult {
  doc: DocumentSchema
  /** apply 失败时返回 failed（fail-closed，整个 transaction 不提交） */
  failed?: string
}
```

**不可逆 Step 的处理**：extension 如果需要产生一个真正不可逆的副作用（如发起一次网络请求、生成随机 id），拆成两步：

1. 在 command 中先生成需要的副作用产物（随机 id 等），把产物作为确定值写入 step 参数
2. step 本身只是"已知值的写入"，天然可逆

这与 ProseMirror 对随机 id 的处理一致。

### 通用 Step（核心提供）

| stepType | 语义 |
|----------|------|
| `set-prop` | 设置 node 某个 JSON Pointer 位置的值 |
| `insert-node` | 在 doc.elements 指定 index 插入节点 |
| `remove-node` | 删除指定 id 的节点 |
| `move-node` | 调整节点顺序 |
| `replace-node` | 原地替换整个节点 |
| `patch-array` | 对任意数组执行 insert/remove/move 批量 op |

通用 step 对**已知路径 + 已知值**的修改足够用。物料专属的"结构性"修改（插入表格行、合并单元格）用自定义 step，因为它们涉及 topology 内的 invariant，需要物料自己实现 invert。

### 自定义 Step（物料注册）

物料提供 `StepSpec`：

```typescript
export interface StepSpec<T extends Step> {
  stepType: string
  fromJSON: (json: unknown) => T
}

export function registerStep(spec: StepSpec<Step>): void
```

表格自定义 step 清单（`@easyink/material-table-kernel/steps`）：

| stepType | 参数 | 说明 |
|----------|------|------|
| `table/insert-row` | `{ nodeId, rowIndex, rowSchema }` | 插入一行，自动扩展跨该位的合并单元格 colSpan/rowSpan |
| `table/remove-row` | `{ nodeId, rowIndex }` | 删除一行，自动收缩合并单元格 |
| `table/insert-col` | `{ nodeId, colIndex, colSchema, defaultCells }` | 插入一列 |
| `table/remove-col` | `{ nodeId, colIndex }` | 删除一列 |
| `table/merge-cells` | `{ nodeId, row, col, colSpan, rowSpan }` | 合并 |
| `table/split-cell` | `{ nodeId, row, col }` | 拆分 |
| `table/resize-col` | `{ nodeId, colIndex, ratio, elementWidth }` | 列 resize |
| `table/resize-row` | `{ nodeId, rowIndex, height }` | 行 resize |
| `table/update-cell` | `{ nodeId, row, col, patch }` | 通用 cell 字段打补丁 |
| `table/set-cell-binding` | `{ nodeId, row, col, binding, kind: 'binding' \| 'staticBinding' }` | 设置/清除绑定 |

每个 step 自带 invert：例如 `table/insert-row` 的 invert 是 `table/remove-row`，并且 `remove-row` 在 apply 前会快照被删除的 rowSchema，以便自身的 invert 恢复原样。

### Mapping

```typescript
export interface StepMap {
  /** 把一个子选区 path 映射到 step after 坐标；null 表示该 path 被删除 */
  mapSelection: (selection: Selection) => Selection | null
}

export interface Mapping {
  readonly maps: readonly StepMap[]
  mapSelection: (selection: Selection) => Selection
  append: (map: StepMap) => Mapping
}
```

Mapping 按 step 顺序连缀。典型场景：插入一列后，选中 `(row, col=3)` 在新坐标中变成 `(row, col=4)`；若该列被删除则选区降级为 `table-selected`（`path=null`）。

**选区降级规则**（由 `table-cell` selection 的 `map` 内部实现）：

- `remove-row` 恰好删除当前选中行 → 退回到 `{ type: 'table-cell', nodeId, path: null }` 或父级选区
- `remove-col` 恰好删除当前选中列 → 同上
- 位置被平移 → path 更新，selection type 不变

## 22.7 Plugin

```typescript
export interface Plugin<T = unknown> {
  /** 全局唯一 key，用于 getPluginState / 依赖声明 */
  readonly key: string
  /** 依赖的其它 plugin key；核心做拓扑排序 */
  readonly dependencies?: readonly string[]
  /** State slot 初始化与 reducer */
  readonly state?: PluginStateSpec<T>
  /** View 贡献：物料渲染、overlay、toolbar */
  readonly view?: PluginView<T>
  /** 按键绑定 */
  readonly keymap?: Keymap
  /** 属性面板贡献 */
  readonly propertyPanel?: (ctx: PropertyPanelContext<T>) => PanelContribution[]
  /** 数据源拖拽 */
  readonly dropHandler?: DatasourceDropHandler
  /** Selection 类型注册 */
  readonly selectionTypes?: readonly SelectionTypeSpec<Selection>[]
  /** Step 类型注册 */
  readonly stepTypes?: readonly StepSpec<Step>[]
  /** Commands：语义化的 tx 构造函数，对外暴露给 UI 与 keymap */
  readonly commands?: Record<string, CommandFactory>
}

export interface PluginStateSpec<T> {
  init: (config: { doc: DocumentSchema }) => T
  apply: (tr: Transaction, prev: T, oldState: EditorState, newState: EditorState) => T
}
```

### Plugin 依赖与执行顺序

`dependencies` 字段声明 plugin 之间的拓扑关系。`createEditorState` 构造时拓扑排序：

- State reducer 按拓扑顺序执行
- View 按拓扑顺序 render（后者覆盖前者的 z-index）
- Keymap 按**反拓扑**顺序分派（最内层优先）

循环依赖 → 启动阶段抛错。

### Plugin State Slot 隔离

Plugin 只能读自己的 state slot（`state.getPluginState<T>(key)`）。要读别的 plugin，必须在 `dependencies` 里显式声明，这样也获得一份类型安全的只读句柄。写只能通过 dispatch 自己的 command。

这是为了让 extension 的作用域清晰——当 chart 插件需要知道"当前 table 选中了哪个 cell"时，不应能力蔓延。

## 22.8 View

### 渲染协议

```typescript
export interface PluginView<T> {
  /** 每帧 reconcile 调用一次，返回 VNode 树（preact h） */
  render: (ctx: ViewContext<T>) => VNode | null
}

export interface ViewContext<T> {
  state: EditorState
  pluginState: T
  dispatch: (tr: Transaction) => void
  /** 只在 render 期间有效：把 preact VNode 挂到"物料局部坐标"的层 */
  layers: {
    content: VNode[]       // 物料内容（选中/未选中均显示）
    overlay: VNode[]       // 选中时的浮层（高亮/子选区）
    toolbar: VNode[]       // 浮动工具栏（在元素上方）
    handles: VNode[]       // 内部 resize 把手等
  }
  /** 宿主提供的工具 */
  utils: {
    t: (key: string) => string
    unit: UnitType
    zoom: number
    getBindingLabel: (ref: BindingRef) => string
  }
}
```

`VNode` = `preact` 的 `h()` 返回值（`VNode<any>`）。EasyInk 在 `@easyink/core` 内部封装一个薄的 `h`、`Fragment`、`onMount`、`onCleanup` re-export，extension 统一引入：

```typescript
import { h, Fragment, onMount } from '@easyink/core/view'
```

这样 extension 不直接依赖 `preact`，未来更换轻量 reconciler（或换成自研）时无迁移成本。

### View 执行模型

- Core 维护一个 dirty flag，每次 `dispatch(tr)` 置 dirty
- 下一帧 `requestAnimationFrame` 调 `reconcile(state)`：遍历所有 plugin 的 `view.render`，把它们的 `layers.*` 按物料合并，产出"页面级 VNode 树"
- VNode 树挂到 Designer Vue 组件内部的一个 div（`<CanvasEditorMount>`）上，preact `render(vnode, host)`
- Vue 外壳（ToolbarManager、PropertiesPanel、StructureTree）照常走 Vue；它们通过 Composable 订阅 EditorState，用 `shallowRef` 缓存

### View 纯函数约束

- 禁止在 render 内访问可变闭包（e.g. `let lastRow = ...`）
- 可变状态一律放 plugin state slot
- DOM 副作用（focus/select/滚动到选区）通过 `ref={r => ...}` 的 onMount 回调完成，且必须在下一次 dispatch 前清理
- `render` 必须幂等：同一 state 多次 render 产生的 VNode 在结构上等价

### View 与 Vue 外壳桥接

```
Vue <PropertiesPanel>
  ├── 订阅 editor.state
  └── 通过 plugin.propertyPanel(ctx) 得到 PanelContribution[]
      └── 渲染 Vue 组件（PropSchemaEditor）

Vue <CanvasEditorMount>           ← 关键桥
  ├── 监听 editor.state + raf
  └── preact.render(reconcile(state), host)
      └── preact VNode 树（各 plugin.view 产出）
```

Canvas 内部不直接用 Vue 响应式——所有画布层内容都走 preact。这样就把"需要严格纯函数的 view"和"天然有可变状态的外壳 UI"物理分开。

## 22.9 ViewModel

结构物料（table、container）必须提供 ViewModel，把 Schema Node 转为"渲染/命中测试用的派生结构"。目的是把视觉增强（虚拟占位行、合并单元格折叠、动态列宽）收束到一个纯函数内，而不是污染 hit-test 与 rect 计算。

```typescript
export interface ViewModel<TNode extends MaterialNode = MaterialNode, TCell = unknown> {
  /** 派生出的逻辑行/列/单元格 */
  readonly rows: readonly ViewModelRow[]
  readonly columns: readonly ViewModelColumn[]
  /** 命中测试：给定元素局部坐标，返回命中的逻辑 path（与 selection path 同结构） */
  hitTest: (localPoint: { x: number, y: number }) => HitResult | null
  /** 根据 path 返回 bounding rect（元素局部坐标） */
  rectOf: (path: readonly unknown[]) => Rect | null
  /** 额外元数据（给 view 消费，如虚拟占位行起止 y） */
  readonly extras: Readonly<Record<string, unknown>>
}

export function buildTableDataViewModel(node: TableNode, placeholderCount = 2): ViewModel
```

**为何不让 view.render 每次现算**：view 要频繁跑（每帧），hit-test 要在 pointer 事件里跑。每个 pointer event 都去做一次 topology 展开成本高。ViewModel 应该在 plugin state 里缓存，state key 是 `doc.revision + node.id`。

### ViewModel 缓存

```typescript
export function memoViewModel<T>(
  compute: (doc: DocumentSchema, nodeId: string) => T,
): (state: EditorState, nodeId: string) => T
```

`memoViewModel` 用 `(doc, nodeId)` 的身份做 key，doc 替换后自动失效。

### Hit-test 调度

画布的 pointer 事件由 EditorCore 顶层接收，做三步：

1. 找出光标所在的物料节点（用元素级 rect）
2. 把屏幕坐标转物料局部坐标
3. 调用该物料 plugin 的 `viewModel.hitTest(local)`，得到 HitResult
4. 派发 `viewPlugin.onPointer`（可选）或直接 dispatch `setSelection(...)`

**plugin 不访问 DOM**。所有 hit-test 都是 ViewModel 纯函数。

## 22.10 Keymap

```typescript
export type KeymapHandler = (
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  event: KeyboardEvent,
) => boolean

export type Keymap = Record<string, KeymapHandler>
```

键位字符串格式：`Mod-Shift-Enter` / `Escape` / `Tab` / `ArrowLeft`。`Mod` 在 macOS 为 `⌘`，其它为 `Ctrl`。

### 分派顺序

Core 按**反拓扑**顺序（最内层 plugin 优先）尝试匹配；第一个返回 `true` 的 handler 终止冒泡。若都返回 `false`，事件冒泡到 Designer Vue 外壳（快捷键如全局保存）。

### 按 selection 过滤

Plugin 可以在 handler 内部按 `state.selection.type` 判断是否响应：

```typescript
keymap: {
  'Enter': (state, dispatch, e) => {
    if (state.selection.type !== 'table-cell') return false
    // ... cell-selected 的 Enter = 进入 content-editing
    return true
  },
}
```

这比"为每个 selection type 再做一层 keymap 注册"简单，且一等公民化 Selection。

## 22.11 PropertyPanel

属性面板由 state 驱动，plugin 提供贡献函数：

```typescript
export interface PropertyPanelContext<T> {
  state: EditorState
  pluginState: T
  dispatch: (tr: Transaction) => void
  t: (key: string) => string
}

export interface PanelContribution {
  /** 唯一 id，用于去重与顺序 */
  id: string
  /** 渲染顺序（越小越靠上）；核心保留 0-99 给基础 section */
  order: number
  /** Section 标题 */
  title?: string
  /** 绑定所有属性的 PropSchema */
  schemas: PropSchema[]
  readValue: (key: string) => unknown
  writeValue: (key: string, value: unknown) => void
  binding?: BindingRef | BindingRef[] | null
  clearBinding?: (bindIndex?: number) => void
  editors?: Record<string, Component>
}
```

Designer 的 `PropertiesPanel` Vue 组件实现：

```vue
<script setup>
const contributions = computed(() => {
  const list = []
  for (const plugin of editor.state.plugins) {
    if (plugin.propertyPanel) {
      const ctx = { state: editor.state, pluginState: editor.state.getPluginState(plugin.key), dispatch: editor.dispatch, t }
      list.push(...plugin.propertyPanel(ctx))
    }
  }
  return list.sort((a, b) => a.order - b.order)
})
</script>
```

纯函数、无 push、无漏推、随 undo 自动回放。物料只要正确按 selection 返回 contribution 即可。

### 默认 section

Core 注册以下基础 plugin，保证通用元素选中也有合理的默认面板：

| 基础 plugin | order 区间 | 贡献内容 |
|-------------|-----------|---------|
| `core/geometry` | 0-9 | x/y/w/h/rotation/alpha |
| `core/material-props` | 10-49 | 当前 material 的 `props` 定义（从 registry 读取） |
| `core/visibility` | 90-99 | hidden / locked |

物料插件的贡献占用 50-89 区间，叠加在基础 section 之后。

## 22.12 DatasourceDropHandler

Drop 语义统一为"selection-aware command"：

```typescript
export interface DatasourceDropHandler {
  /** 鼠标在该物料上方 dragover 时触发，返回 drop zone 描述符 */
  onDragOver: (ctx: DropContext) => DropZone | null
  /** drop 时触发：plugin 自行构造 Transaction 并 dispatch */
  onDrop: (ctx: DropContext) => void
}

export interface DropContext {
  state: EditorState
  dispatch: (tr: Transaction) => void
  field: DatasourceFieldInfo
  /** 物料局部坐标（已乘 zoom & 减偏移） */
  local: { x: number, y: number }
  node: MaterialNode
}
```

Core 的 canvas pointer 层负责：

1. 命中物料 → 找到该物料 plugin 的 dropHandler
2. 每次 pointermove 调 `onDragOver` 得 DropZone，core 在 overlay 层渲染统一的绿/红高亮框
3. pointerup → 调 `onDrop`，plugin 自行 dispatch

物料包没有 dropHandler 时：core 回退到"整个元素 drop zone + 写 `node.binding` 单值绑定"。

## 22.13 Command Factory

Plugin 的 `commands` 暴露**构造 Transaction 的工厂**。UI / keymap / 测试一律通过这些工厂发起变更，避免直接手写 step：

```typescript
export type CommandFactory = (state: EditorState, ...args: unknown[]) =>
  | Transaction
  | null

// 表格 plugin 注册示例
commands: {
  insertRowBelow(state) {
    const sel = state.selection
    if (sel.type !== 'table-cell') return null
    const [row] = sel.path as [number, number]
    const node = state.doc.elements.find(e => e.id === sel.nodeId) as TableNode
    return state.tr
      .step(new TableInsertRowStep({ nodeId: node.id, rowIndex: row + 1, rowSchema: defaultRow(node) }))
      .scrollIntoView()
  },
}
```

调用：

```typescript
const tr = plugin.commands.insertRowBelow(editor.state)
if (tr) editor.dispatch(tr)
```

## 22.14 History

```typescript
export const historyPlugin: Plugin<HistoryState>

interface HistoryState {
  done: readonly HistoryEntry[]
  undone: readonly HistoryEntry[]
  /** 合并窗口（毫秒）：相邻同组 tr 合并成一条 undo */
  groupWindowMs: number
}

interface HistoryEntry {
  tr: Transaction
  /** invert 后的 Transaction，undo 直接 dispatch */
  inverted: Transaction
  timestamp: number
  /** 合并键：tr.setMeta('historyGroup', key) 设置；相同 key 且时间窗内相邻 → 合并 */
  groupKey?: string
}
```

**合并规则**：

- 连续 typing、连续拖动 resize 手柄都应合并成单条 undo
- 发起方通过 `tr.setMeta('historyGroup', 'cell-content:<nodeId>:<row>:<col>')` 控制合并键
- 相同合并键 + 时间差 < `groupWindowMs` → 新 tr 的 steps 并入前一 entry 的 tr
- 任何 `tr.setMeta('historyGroup', null)` 或 selection 主动跳到其它节点 → 截断合并窗口

### 协同预留

HistoryState 本身纯数据，未来接 CRDT 时，将"本地 inverted 栈"替换为 CRDT 的 `undoManager` 而无需改动 extension 代码。

## 22.15 EditorView（Designer 集成点）

EditorView 是"把 EditorCore 接到 DOM"的胶水：

```typescript
export interface EditorView {
  readonly state: EditorState
  /** 唯一写入入口 */
  dispatch: (tr: Transaction) => void
  /** 订阅 state 变化 */
  subscribe: (listener: (state: EditorState) => void) => () => void
  /** 释放（移除 DOM 监听、取消 raf） */
  destroy: () => void
}

export function createEditorView(config: {
  state: EditorState
  mount: HTMLElement
  /** preact render 目标（画布内容层） */
  canvasMount: HTMLElement
}): EditorView
```

Designer 的 `EasyInkDesigner.vue` 在 `onMounted` 里创建 EditorView，Vue 外壳通过 Composable 订阅：

```typescript
export function useEditor(): {
  state: Ref<EditorState>
  dispatch: (tr: Transaction) => void
}
```

## 22.16 重构之后的表格物料

### plugin 组装（table-data 示例）

```typescript
// @easyink/material-table-data/src/extension.ts
import { defineMaterial } from '@easyink/core'
import * as steps from '@easyink/material-table-kernel/steps'
import { buildTableDataViewModel } from '@easyink/material-table-kernel'
import { tableCellSelection } from './selection'
import { tableViewPlugin } from './view'
import { tableKeymap } from './keymap'
import { tablePropertyPanel } from './property-panel'
import { tableDropHandler } from './drop'
import { tableCommands } from './commands'
import { schema, defaults } from './schema'

export const tableDataMaterial = defineMaterial({
  type: 'table-data',
  category: 'data',
  schema,
  createDefaultNode: defaults,
  plugins: [
    {
      key: 'material-table-data',
      selectionTypes: [tableCellSelection],
      stepTypes: Object.values(steps),
      state: {
        init: () => ({ viewModelCache: new WeakMap() }),
        apply: (tr, prev) => prev,  // viewModel 用 memoViewModel，本 slot 仅存 cache 容器
      },
      view: tableViewPlugin,
      keymap: tableKeymap,
      propertyPanel: tablePropertyPanel,
      dropHandler: tableDropHandler,
      commands: tableCommands,
    },
  ],
})
```

### View 实现（精简示例）

```typescript
// @easyink/material-table-data/src/view.ts
import { h } from '@easyink/core/view'
import { buildTableDataViewModel } from '@easyink/material-table-kernel'

export const tableViewPlugin: PluginView<TableState> = {
  render(ctx) {
    const { state, dispatch, utils } = ctx
    const sel = state.selection

    for (const node of state.doc.elements) {
      if (node.type !== 'table-data') continue
      const vm = buildTableDataViewModel(node)

      // 内容层：纯视觉渲染
      ctx.layers.content.push(
        h(TableContent, { node, vm, unit: utils.unit, getBindingLabel: utils.getBindingLabel }),
      )

      // Overlay：仅在该 table 上有 table-cell selection 时渲染
      if (sel.type === 'table-cell' && sel.nodeId === node.id) {
        const cellPath = sel.path as readonly [number, number]
        const rect = vm.rectOf(cellPath)
        if (rect) {
          ctx.layers.overlay.push(
            h(CellHighlight, { rect, unit: utils.unit }),
            h(CellResizeHandles, { node, vm, cellPath, dispatch }),
          )
        }
        ctx.layers.toolbar.push(
          h(TableToolbar, { node, vm, cellPath, dispatch }),
        )
      }
    }

    return null  // render 直接往 ctx.layers push；不返回顶层 VNode
  },
}
```

> 对比旧实现：没有 `createElement`、`cssText`、`cleanupFns[]`、`pointerdown` 手写监听。所有交互都通过 props 传 dispatch。

### PropertyPanel 贡献

```typescript
export const tablePropertyPanel: Plugin['propertyPanel'] = ({ state, dispatch, t }) => {
  const sel = state.selection
  if (sel.type === 'table-cell' && sel.nodeId) {
    const node = state.doc.elements.find(e => e.id === sel.nodeId) as TableNode
    const [row, col] = sel.path as [number, number]
    const cell = node.table.topology.rows[row]?.cells[col]
    if (!cell) return []

    return [{
      id: 'table-cell',
      order: 70,
      title: t('designer.property.cellProperties'),
      schemas: CELL_PROP_SCHEMAS,
      readValue: (key) => readCellProp(cell, key),
      writeValue: (key, value) => {
        dispatch(tableCommands.updateCellProp(state, { row, col, key, value }))
      },
      binding: cell.binding ?? cell.staticBinding ?? null,
      clearBinding: () => dispatch(tableCommands.clearCellBinding(state, { row, col })),
    }]
  }
  return []
}
```

### Commands 示例（列 resize）

```typescript
export const tableCommands = {
  resizeColumn(state, args: { nodeId: string, colIndex: number, newRatio: number, newWidth: number }): Transaction | null {
    return state.tr
      .step(new TableResizeColStep(args))
      .setMeta('historyGroup', `resize-col:${args.nodeId}:${args.colIndex}`)
  },
  // ... 其它命令
}
```

连续 pointermove 每帧 dispatch 一次 resize tr，`historyGroup` 相同 → history 合并成单条 undo。

## 22.17 测试策略

### 核心层（Node + jsdom）

- `EditorState.apply` 的幂等性与不可变性
- 每个通用 / 自定义 Step 的 `apply` × `invert` round-trip 等价
- Mapping 在多 step 串联下的正确性
- Selection map 的降级规则
- History 合并窗口与 groupKey 行为
- Plugin 拓扑排序与循环依赖检测

### Plugin 层

- `view.render(state)` 对固定 state 产出稳定 VNode（快照测试）
- `propertyPanel(ctx)` 对各 selection 类型的 contribution 完整性
- `keymap` 在各 selection 下的返回值
- `dropHandler.onDragOver` / `onDrop` 的命中逻辑

### E2E（Playwright）

必跑用户旅程：

1. 新建空模板 → 拖 table-data → 绑字段 → 深度编辑改 cell 绑定 → 切行 → undo/redo → 导出 PDF
2. 同样流程的 table-static
3. 多选 element + 批量删除 → undo
4. 属性面板修改 cell typography → view 层可视化验证（截图）

E2E 固件放 `e2e/fixtures/*.json`，每条用例以"原始 state.json → 期望 state.json"的方式断言，尽量避免脆弱的 DOM 断言。

## 22.18 迁移清单

### 删除

- `packages/materials/table-kernel/src/deep-editing.ts`（整文件）
- `packages/designer/src/composables/use-deep-editing.ts`
- `packages/designer/src/components/DeepEditDragHandle.vue`（如已被新 overlay 层取代）
- `packages/core/src/material-extension.ts` 中：
  - `DeepEditingDefinition` / `DeepEditingPhase` / `PhaseContainers` / `PhaseTransition`
  - `SubSelectionHandler` / `InternalResizeHandler` / `KeyboardRouteHandler`
  - `PropertyPanelOverlay`（被 PanelContribution 替代）
  - `MaterialDesignerExtension`（被 `Plugin` + `MaterialDefinition` 替代）
  - `NodeSignal`（不再需要框架无关订阅，view 纯函数取代）
- `packages/core/src/commands/` 下所有**物料专属**命令类
- `packages/core/src/command.ts` 的 OOP Command 类被保留为"对 Transaction 的语义封装"的空文件或整体删除（视旧 UI 迁移进度定，最终删除）

### 保留

- `@easyink/material-table-kernel` 中：
  - `geometry.ts` / `topology.ts` / `hit-test.ts`（`hitTestGridCell` / `resolveMergeOwner` / `computeCellRect` / `computeRowScale`）
  - `cell-schemas.ts` / `typography.ts` / `schema.ts`
  - `render.ts`（`renderTableHtml` 继续给 Viewer 与设计态内容层共用）
  - 移除 `computeCellRectWithPlaceholders` / `hitTestWithPlaceholders`：placeholder 由 `buildTableDataViewModel` 内部处理

### 新增

- `@easyink/core/view`：导出 `h / Fragment / render / onMount / onCleanup / VNode`，内部 re-export `preact`
- `@easyink/core/editor`：`EditorState / Transaction / Step / Mapping / Plugin / createEditorState / createEditorView / historyPlugin / defineMaterial`
- `@easyink/material-table-kernel/steps/*`：表格专属 step（按 22.6 清单）
- `@easyink/material-table-kernel/view-model.ts`：`buildTableDataViewModel` / `buildTableStaticViewModel`
- `@easyink/material-table-static` / `@easyink/material-table-data` 各自的：
  - `extension.ts`（defineMaterial）
  - `view.tsx`（preact view）
  - `keymap.ts`
  - `property-panel.ts`
  - `drop.ts`
  - `commands.ts`

### Designer 适配

- `EasyInkDesigner.vue` 在 `onMounted` 里创建 `EditorView`
- `CanvasWorkspace.vue` 内部新增 `<CanvasEditorMount>`，该组件在 `onMounted` 调 `preact.render`，在 `onBeforeUnmount` 清理
- `PropertiesPanel.vue` 重写成"遍历 plugin.propertyPanel 得 contribution → 渲染 PropSchemaEditor"
- `ToolbarManager.vue` 的浮动工具条改为消费 `layers.toolbar`（从 preact VNode 反向提取…这条在代码阶段再议）
- 移除 `use-deep-editing.ts` 的所有使用点
- `DesignerStore` 的 `enterDeepEditing` / `exitDeepEditing` / `transitionPhase` / `setPropertyOverlay` 接口整体删除，状态通过 `EditorState.selection` 表达

## 22.19 里程碑

### M1（架构就绪，本次文档验收后启动）

- 新增 `@easyink/core/editor` 核心：State / Transaction / Step / Mapping / Plugin / historyPlugin
- 新增 `@easyink/core/view` 的 preact 封装
- Designer 的 EditorView 桥接层
- `core/geometry` / `core/visibility` / `core/material-props` 三个基础 plugin
- **交付物**：能跑一个只含 text / rect 的最小示例，选中 / 移动 / resize / undo 完整通路

### M2（表格物料迁移）

- `material-table-kernel/steps` 全部自定义 step + invert
- `buildTableDataViewModel` / `buildTableStaticViewModel`
- `@easyink/material-table-static` extension
- `@easyink/material-table-data` extension
- 旧 `table-kernel/deep-editing.ts` / `use-deep-editing.ts` 删除
- **交付物**：playground 两张示例模板（静态表 + 数据表）所有旧交互恢复，`pnpm lint / typecheck / build` 绿

### M3（测试与协同预留）

- 核心 step round-trip 完整测试覆盖
- plugin-level view 快照测试
- Playwright E2E 两条完整旅程
- `serializeEditorState / deserializeEditorState` 单测 + round-trip
- **交付物**：CI 全绿，覆盖率门槛与现状持平

后续物料（chart / relation / container）按同模板套。不在本次重构范围内。

## 22.20 与现有章节的关系

- **§04 分层架构**：Editor Core 是"数据层"与"交互层"之间的新桥梁；旧的 Command 模式被 Transaction/Step 替代，§12 需要改写
- **§05 Schema DSL**：不受影响；Schema 仍是 EditorState 的 `doc` 字段
- **§07 布局引擎**：不受影响；ViewModel 是新的派生层，不改变布局计算
- **§10 设计器交互**：10.7 整节重写，见该文档
- **§11 物料体系**：11.6 整节重写，见该文档
- **§12 Command 与 Undo**：需要整章替换为"Transaction 与 History"，本次文档验收后同步重写
- **§17 Schema 迁移**：不受影响
- **§19 测试**：补充 EditorCore 单测与 E2E 范围

## 22.21 开放问题（进入 M1 代码阶段再定）

1. preact 在 Vue 宿主内的具体挂载方式：独立 mountpoint 还是 portal？z-index stacking 如何与 Vue 外壳协作？
2. `ctx.layers.toolbar` 的定位坐标系：应跟随元素 overflow 滚动，还是挂载到页面级 overlay 再命令式定位？
3. HistoryState 与 Schema version migration 的交互：文档版本升级后是否清空 history？
4. EditorView 是否需要支持"多 editor 实例"（同一页面多个设计器，如模板对比视图）？
