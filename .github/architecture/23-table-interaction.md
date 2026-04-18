# 23. Table Interaction

> 表格物料（`@easyink/material-table-static`、`@easyink/material-table-data`）的统一交互模型。
> 在 §22 EditorCore 之上，定义两类表格的选区/编辑/操作语义，对齐 Notion 数据库的「单击即编辑」范式。

## 23.1 设计目标与对标

| 维度 | 决策 | 对标 |
|------|------|------|
| 编辑触发 | 单击空白 cell 直接进入编辑 | Notion / Coda |
| 选区粒度 | 单 cell（不引入 cell-range/multi-range） | Notion |
| 行/列操作入口 | 顶部浮动工具栏 | Notion / Linear |
| 字段绑定 | 仅拖入触发 | Airtable |
| 合并单元格 | static 支持，data 禁用 | Airtable / Notion |
| 列宽调整 | 拖动 + 实时数值 tooltip（mm） | Excel |
| 行高 | 内容自适应；repeat-template 用户设最小高 | Notion default |

刻意**不做**的能力（避免越过 Notion 边界，保证语义一致）：

- 无区域多选（cell-range / multi-range）
- 无右键菜单
- 无剪贴板（含外部 Excel 互通）
- 无键盘导航（Tab / 方向键 / Enter 跳格）
- 无填充（Cmd+D/R）
- 无右键插入/删除行列；全部走顶部浮动工具栏

仅保留两个表格相关快捷键：

| 快捷键 | 行为 | 适用 |
|--------|------|------|
| `Delete` / `Backspace` | 清空当前 cell 内容（不删行/列） | 选中 cell 时 |
| `Alt+Enter` | 单元格编辑态内插入软换行 | cell 编辑态 |

`Esc` 由 EditorCore 统一处理（退出 cell 编辑→退出 cell 选区→退出元素选区）。

## 23.2 命中区域与点击语义

```
┌──────────────────────────────────────────────┐
│  ←─ 8px ─→  元素热区（外边框内 8px）           │
│  ┌────────────────────────────────────────┐  │
│  │  header 行（双击编辑文本）              │  │
│  ├────────────────────────────────────────┤  │
│  │  cell（单击直接进入编辑）               │  │
│  ├────────────────────────────────────────┤  │
│  │  ...                                    │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

命中优先级（高 → 低）：

1. **列宽 handle**（列分隔线 ±3px）→ 进入 column-resize 拖拽
2. **行高 handle**（行分隔线 ±3px）→ 进入 row-resize 拖拽
3. **元素热区**（外边框内 8px 圈）→ 选中 element（不进 cell）
4. **header 行单击** → 选中 header cell（**不进编辑**），双击 → 进入编辑文本
5. **普通 cell 单击** → 直接进入 cell 编辑态
6. **repeat-template 角标 hover 区** → 显示循环徽标，单击 → 选中 repeat-template 整行

未选中表格元素时，单击表格内任意位置同时完成「选中元素 + 进入 cell」（**不**采用两段式）。

## 23.3 选区模型

复用 §22.5 内置 `Selection`，仅注册 `table-cell` 一种自定义类型，结构与 §22.5 示例一致，`path = [row, col]`。

不引入 `table-cell-range`、不引入多选。所有「批量行/列」语义只在 step 内部承载（如 `RemoveRowStep` 接 `rowIndex`，对应工具栏单一动作）。

## 23.4 Cell 类型推断

cell 类型不写入 schema，由派生函数推断：

```typescript
type CellMode = 'text' | 'binding'

function inferCellMode(cell: TableCellSchema): CellMode {
  return cell.staticBinding ? 'binding' : 'text'
}
```

| 模式 | 编辑态形态 | 进入方式 |
|------|----------|--------|
| `text` | 行内文本编辑器（contenteditable） | 单击空白 cell |
| `binding` | 侊入式面板（位置见 §23.6），cell 上仍渲染 `{#fieldLabel}` token | 单击已绑定 cell |

用户**不能**主动「先把 cell 标记为 binding」。绑定态唯一入口是**从数据源面板拖入字段**到 cell 上（沿用既有 `DatasourceDropHandler`）；解除绑定唯一入口是侊入式面板上的「取消绑定」按钮，触发 `SetCellBindingStep(nodeId, row, col, null)` 后自动回落 `text` 模式。

## 23.5 浮动工具栏（floatingToolbarPlugin）

新增**通用** `floatingToolbarPlugin`（位于 `@easyink/core/builtin-plugins`），不只服务表格。

### 协议

```typescript
export interface ToolbarItem {
  id: string
  label?: string
  icon?: string
  enabled?: (state: EditorState) => boolean
  run: (view: EditorView) => void
}

export interface ToolbarContribution {
  /** 该浮条所属物料 plugin key，渲染顺序按 plugin 注册顺序 */
  ownerKey: string
  /** 决定是否显示当前浮条；通常基于 selection.type / nodeId */
  visible: (state: EditorState) => boolean
  /** 浮条吸附目标 nodeId；返回 null 表示画布顶部 */
  anchorNodeId: (state: EditorState) => string | null
  items: (state: EditorState) => ToolbarItem[]
}

// Plugin 通过 spec.toolbar 注册
defineMaterial({
  type: 'table-static',
  // ...
  toolbar: { ownerKey: 'table-static', visible, anchorNodeId, items },
})
```

### 渲染

- 多个 plugin 可同时贡献多条浮条；designer 在画布层**顶部堆叠**渲染（每条 32px 高，垂直排列）。
- 单条浮条位置：`anchor element bbox 上方 8px`；若超出画布上沿，自动翻转到 bbox 下方。
- 浮条本身用 preact 渲染（与画布同体系），样式由 designer 通过 token 注入。

### 表格物料贡献项

`table-static` 与 `table-data` 在选中态各自贡献一条浮条，按钮组：

| 按钮 | 启用条件 | step |
|------|--------|------|
| 在上方插入行 | 选中 cell（非 header 之上的最顶行） | `InsertRowStep(nodeId, row)` |
| 在下方插入行 | 选中 cell（非 footer 之下） | `InsertRowStep(nodeId, row + 1)` |
| 在左侧插入列 | 选中 cell | `InsertColStep(nodeId, col)` |
| 在右侧插入列 | 选中 cell | `InsertColStep(nodeId, col + 1)` |
| 删除行 | 选中 cell 且非唯一行；data 表 header/footer 行禁用 | `RemoveRowStep(nodeId, row)` |
| 删除列 | 选中 cell 且非唯一列 | `RemoveColStep(nodeId, col)` |
| 合并 | **仅 static**；选中 cell 时灰显（无区域选区，需先扩展为区域，本期不做） | — |
| 拆分 | **仅 static**；选中已合并的 owner cell | `SplitCellStep(nodeId, row, col)` |

> 合并按钮在本期 **保留位置但禁用**，待后续引入 cell-range 选区后启用。

## 23.6 侊入式面板（PropertiesPanel 深度选区 slot）

不新建 Drawer，直接复用 designer 的 `PropertiesPanel`。在 panel 顶部增加 **「深度选区面板」slot**，slot 内容由 plugin 通过 `spec.deepPanel` 贡献：

```typescript
export interface DeepPanelContribution {
  ownerKey: string
  visible: (state: EditorState) => boolean
  view: (ctx: DeepPanelContext) => preact.VNode
}
```

`table-data` 的 `deepPanel` 在「选中绑定 cell」时显示：

- 顶部：`字段：{fieldLabel}`（点击可换字段，下拉列出当前数据源字段树）
- 下方：「取消绑定」按钮（红色文本，触发 `SetCellBindingStep(..., null)`）
- 底部：格式化选项（数字/日期）— 后续扩展

`table-static` 的 `deepPanel` 在「选中绑定 cell（即静态绑定到字面量）」时显示同样的「取消绑定」按钮。

非绑定 cell 选中时，深度面板留空，下方继续显示元素属性面板原有内容（typography / border / cellPadding 等）。

## 23.7 表格 step 体系

完全沿用 `@easyink/material-table-kernel/steps` 既有 step 类，删除以下内容：

| 删除 | 原因 |
|------|------|
| `MergeCellsStep` 在 `table-data` 上下文的暴露 | data 禁用合并 |
| `SplitCellStep` 同上 | 同上 |
| `computeCellRectWithPlaceholders` / `hitTestWithPlaceholders` 系列 | placeholder 虚拟行不再渲染 |
| 旧 `MaterialDesignerExtension` / `DeepEditingDefinition` / `@easyink/core/commands/*` | §22 已废弃 |

新增/修改：

| 变更 | 说明 |
|------|------|
| `RemoveRowStep` 增加 `role` 守卫 | data 表禁止删 header / footer 唯一行；试图删除直接 throw（被 toolbar.enabled 提前过滤） |
| `MergeCellsStep` plugin 注册仅 static | data 物料注册时不传 |
| `TableDataSchema` 增加 `repeatMinRowHeight?: number` | 用户在属性面板设的最小高，单位 mm |

## 23.8 repeat-template 渲染

设计态 `repeat-template` 行的渲染规则：

- 仅渲染 1 行（schema 中实际就是 1 行）
- 左侧 8px 区域贴一个**循环角标**（圆形 ↻ 图标），由 designer 浮层绘制（不进 schema）
- 行边框使用虚线（border-style: dashed），区别于 header/footer
- `repeatMinRowHeight` 决定行的最小高度；`max(content-height, repeatMinRowHeight)`
- **不再**渲染任何虚拟 placeholder 行；`renderTableHtml` 的 `virtualRows` 参数移除

viewer/导出场景下，`repeat-template` 在数据展开后由 `viewer.ts` 计算实际行数；与 designer 完全解耦。

## 23.9 列宽 / 行高调整

- 拖拽 column handle 时，`@easyink/designer` 在浮层渲染 tooltip：`{currentWidth}mm`（保留 2 位小数）
- 拖拽 row handle 时，tooltip：`{currentHeight}mm`
- 不引入吸附；不引入双击自适应
- 实时调用 `dispatch(state.tr.step(new ResizeColumnStep(...)).setMeta('historyGroup', ...))`，依赖既有 historyGroup 折叠
- handle 命中区域：分隔线 ±3px；与 cell 命中互斥（handle 优先级高于 header 双击）

## 23.10 列头交互细则

| 场景 | 单击 | 双击 |
|------|------|------|
| `table-data` header cell | 选中 cell | 进入文本编辑（编辑字段标签 `cell.content.text`） |
| `table-data` header cell（已绑定） | 选中 cell + 显示深度面板（取消绑定/换字段） | 进入文本编辑（编辑显示标签，不影响绑定字段路径） |
| `table-static` header cell | 进入文本编辑 | — |
| 字段拖入 header cell | — | 触发 `SetCellBindingStep`，后续整列展开使用该字段 |

## 23.11 删除/失效边界

| 场景 | 行为 |
|------|------|
| 选中元素后按 Delete | 删除整个表格元素（沿用通用元素删除路径） |
| 选中 cell 后按 Delete/Backspace | 清空 `cell.content.text`，保留绑定（如有） |
| cell 编辑态按 Backspace 至空 | 仅删除字符；不退出编辑 |
| 选中 cell 后元素被外部删除 | EditorCore 自动把 selection 降级为 empty |
| 数据源被移除导致 cell.staticBinding 失效 | render 显示灰色 `{#unknown}`；深度面板提示「字段不存在，请重新绑定或取消」 |

## 23.12 包边界与代码归属

| 责任 | 包 |
|------|------|
| topology / geometry / hit-test / typography / 渲染 HTML | `@easyink/material-table-kernel`（保留） |
| step 类 + selection spec | `@easyink/material-table-kernel/steps` |
| Plugin/扩展（`defineMaterial`、toolbar、deepPanel、view） | `@easyink/material-table-static`、`@easyink/material-table-data` |
| EditorCore（state / transaction / plugin / view 渲染器 / floatingToolbarPlugin） | `@easyink/core` |
| 画布 preact 挂载点、PropertiesPanel slot 注入、tooltip 浮层 | `@easyink/designer` |
| 数据源面板拖出字段 | `@easyink/designer` + `@easyink/datasource` |

## 23.13 迁移与兼容

- **不提供迁移**：旧 schema 中 `table-data` 的合并单元格运行时**忽略 mergeAnchor**（即按拆分后形态渲染），不写迁移脚本（未投产，无真实数据）
- 旧 `table-data.placeholderRows` 字段（如有）从 schema 中删除（schema 版本号 +1，由 §17 注册表处理）
- 旧 `MaterialDesignerExtension` / `DeepEditingDefinition` / `@easyink/core/commands/*` 的所有引用本 PR 一次性删除，不留 deprecation shim

## 23.14 验证清单

- 单元测试：每个 toolbar 项的 `enabled` 与 `run` 各覆盖 happy path 与边界（仅一行/仅一列等）
- 单元测试：`inferCellMode` 推断
- 集成测试：选中表格元素 → 单击 cell → 进入编辑 → Delete 清空 → Esc 退出
- 集成测试：拖入字段 → 进入绑定态 → 深度面板显示字段名 → 取消绑定 → 回落 text 态
- 集成测试：data 表合并入口在工具栏不可见
- 视觉回归：repeat-template 角标 + 虚线边框
- 性能：列宽连续拖动产生的 history 项 ≤ 1（historyGroup 折叠）
- `pnpm lint && pnpm typecheck && pnpm build` 通过
