# 24 -- 属性面板动态化架构

> 解决 PropertiesPanel 静态 PropSchema 无法支持 deep editing 阶段动态属性、数据源面板按需显隐、自定义编辑器注册三类问题。

## 问题本质

当前属性面板的渲染数据来源是 `MaterialDefinition.props: PropSchema[]`，在物料注册时一次性确定，整个生命周期内不变。这导致：

1. **单 PropSchema 无法表达多上下文** -- 表格 deep editing 的 cell-selected 阶段需要展示单元格级 typography、border、padding、binding，与表格级属性完全不同，但面板只知道 "这个元素是 table-data"，不知道当前处于哪个 deep editing phase，更不知道选中了哪个 cell。
2. **BindingSection 无法按需显隐** -- line/rect 等无 `bindable` 能力的物料仍然渲染空的绑定区域；table cell-selected 阶段需要展示 cell 的 binding 而非表格节点的 binding。
3. **属性值读写路径固化** -- `readPropValue` 使用 `getByPath(el.props, key)`，无法处理 `table.rows[r].cells[c].typography.fontSize` 这种深层嵌套路径，且 command 生成逻辑固化在 PropertiesPanel 内。

## 设计决策摘要

| 决策 | 结论 | 原因 |
|------|------|------|
| 叠加方式 | 追加叠加（overlay 始终在基础层下方） | 用户需要同时可见/可编辑表格级和单元格级属性 |
| 机制范围 | 通用机制（任何 DeepEditingPhase 可用） | chart、container、relation 未来也需要 |
| PropSchema 驱动方 | 物料命令式推送 | 物料最清楚当前 phase 的上下文和读写路径 |
| 值读写 | 回调委托给物料 | 路径映射 + command 生成逻辑与物料强耦合 |
| 推送 payload | 完整推送（schemas + readValue + writeValue + binding） | 面板保持被动，不需要理解物料内部结构 |
| 叠加层清除 | 面板自动感知 deep editing 状态变化 | 物料不需要关心退出时的清理 |
| 继承策略 | Schema undefined = 继承 | 最小存储，避免复制膨胀 |
| 继承 UX | Placeholder 展示继承值 + 清除按钮 | 明确可见继承关系 |
| 多选 | 仅单选 | 简化首版实现 |
| BindingSection | 按 capability + deep editing context 显隐 | 精确控制 |
| DataSourcePanel | 始终由用户手动控制，不联动 | 保持窗口行为一致 |
| 自定义编辑器 | 支持，随推送携带组件 | 物料可定制复杂编辑器（如四边边框） |
| 同 phase 内多次推送 | 允许（例如切换 cell 时刷新 readValue） | sub-selection 变化不触发 phase 切换 |

---

## 核心概念

### PropertyPanelOverlay -- 叠加层描述符

物料通过 `requestPropertyPanel` 推送的 payload：

```typescript
interface PropertyPanelOverlay {
  /** 叠加层标识（同一 id 重复推送 = 更新，不同 id = 追加） */
  id: string
  /** 叠加层标题（显示在面板中的分组标题前缀或 section header） */
  title?: string
  /** 属性 schema 声明 */
  schemas: PropSchema[]
  /** 读取属性值。面板每次渲染时调用，物料内部处理继承回退。 */
  readValue: (key: string) => unknown
  /** 写入属性值。物料内部处理 command 生成和路径映射。 */
  writeValue: (key: string, value: unknown) => void
  /**
   * 读取继承值（可选）。
   * 当 readValue 返回 undefined 时，面板调用此方法获取继承值作为 placeholder 显示。
   * 不提供时，undefined 的属性不显示 placeholder。
   */
  readInheritedValue?: (key: string) => unknown
  /**
   * 清除覆盖值（可选）。
   * 将属性恢复为 undefined（回到继承状态）。
   * 不提供时，属性编辑器不显示"清除覆盖"操作。
   */
  clearOverride?: (key: string) => void
  /**
   * 当前上下文的数据绑定引用（可选）。
   * 提供时 BindingSection 展示此 binding 而非元素顶层 binding。
   * 设为 null 时 BindingSection 隐藏。
   */
  binding?: BindingRef | BindingRef[] | null
  /** 清除绑定的回调（对应上面的 binding） */
  clearBinding?: (bindIndex?: number) => void
  /**
   * 自定义编辑器组件映射（可选）。
   * key = PropSchema.editor 字段值，value = Vue 组件。
   * 推送时携带，面板按 editor 字段查找。
   */
  editors?: Record<string, Component>
}
```

### requestPropertyPanel 签名变更

```typescript
// 现有（空实现）
requestPropertyPanel(descriptor: PropertyPanelRequest): void

// 扩展后
requestPropertyPanel(overlay: PropertyPanelOverlay | null): void
```

推送 `null` = 显式清除当前物料推送的所有叠加层（通常不需要，面板自动处理）。

---

## PropertiesPanel 渲染模型

### 三层渲染区域

```
+----------------------------------------------+
| Geometry（位置/尺寸）                          |  <-- 始终显示
+----------------------------------------------+
| 基础层：MaterialDefinition.props 驱动         |  <-- 始终显示（来自注册时静态 PropSchema）
| - 分组渲染（content / typography / ...）       |
+----------------------------------------------+
| 叠加层：PropertyPanelOverlay.schemas 驱动     |  <-- 仅 deep editing 推送时显示
| - overlay.title 作为 section header           |
| - 分组渲染（cell-typography / cell-border / ...）|
| - 继承属性 placeholder + 清除按钮             |
+----------------------------------------------+
| BindingSection                                |  <-- 按规则显隐
+----------------------------------------------+
| 可见性/锁定                                    |  <-- 始终显示
+----------------------------------------------+
```

### BindingSection 显隐规则

```
if (overlay?.binding !== undefined) {
  // deep editing 推送了 binding 上下文
  if (overlay.binding === null) {
    // 显式隐藏
    隐藏 BindingSection
  } else {
    // 展示推送的 binding（如单元格的 binding）
    展示 BindingSection，数据源 = overlay.binding
    清除回调 = overlay.clearBinding
  }
} else if (material.capabilities.bindable === false) {
  隐藏 BindingSection
} else {
  // 默认：展示元素顶层 binding
  展示 BindingSection，数据源 = element.binding
  清除回调 = ClearBindingCommand
}
```

---

## 状态管理

### DesignerStore 扩展

```typescript
// 新增 reactive 状态
class DesignerStore {
  /** 当前活跃的叠加层（由物料推送，面板消费） */
  private _propertyOverlay: PropertyPanelOverlay | null = null

  /** 物料调用入口 */
  setPropertyOverlay(overlay: PropertyPanelOverlay | null): void {
    this._propertyOverlay = overlay
  }

  get propertyOverlay(): PropertyPanelOverlay | null {
    return this._propertyOverlay
  }
}
```

### MaterialExtensionContext 实现补全

```typescript
// extension-context.ts
requestPropertyPanel(overlay: PropertyPanelOverlay | null) {
  store.setPropertyOverlay(overlay)
}
```

### 自动清除逻辑

PropertiesPanel 监听 deep editing 状态变化：

```typescript
// PropertiesPanel.vue
watch(
  () => store.deepEditing,
  (newState, oldState) => {
    // deep editing 退出或 phase 变化时，清除叠加层
    if (!newState?.nodeId || newState.nodeId !== oldState?.nodeId
        || newState.currentPhase !== oldState?.currentPhase) {
      store.setPropertyOverlay(null)
    }
  },
)
```

物料在新 phase 的 `onEnter` 或 sub-selection 变化时重新推送，覆盖旧叠加层。

---

## 自定义编辑器

### PropSchemaEditor 扩展

```typescript
// PropSchemaEditor.vue

const props = defineProps<{
  schema: PropSchema
  value: unknown
  disabled?: boolean
  fonts?: Array<{ family: string, displayName: string }>
  t: (key: string) => string
  // 新增
  inheritedValue?: unknown       // 继承值，用于 placeholder
  canClearOverride?: boolean      // 是否显示清除覆盖按钮
  customEditors?: Record<string, Component>  // 自定义编辑器映射
}>()
```

渲染逻辑：

```
if (schema.editor && customEditors?.[schema.editor]) {
  渲染自定义编辑器组件，传入 schema + value + inheritedValue + onChange
} else {
  走现有 switch/case 逻辑
}
```

继承 UX：

```
if (value === undefined && inheritedValue !== undefined) {
  编辑器的 placeholder = formatValue(inheritedValue)
  显示"清除覆盖"按钮 -> 点击调用 clearOverride(key)
} else if (value !== undefined && canClearOverride) {
  显示"清除覆盖"按钮 -> 点击调用 clearOverride(key)
}
```

### 自定义编辑器组件契约

```typescript
interface CustomEditorProps {
  schema: PropSchema
  value: unknown
  inheritedValue?: unknown
  disabled?: boolean
  fonts?: Array<{ family: string, displayName: string }>
  t: (key: string) => string
}

// emits
interface CustomEditorEmits {
  (e: 'change', key: string, value: unknown): void
}
```

物料包可以在自己的包内定义 Vue 组件，然后通过 `PropertyPanelOverlay.editors` 传入。

---

## 表格物料实践

### cell-selected phase 实现示例

```typescript
// materials/table-data/src/designer.ts

function createCellSelectedPhase(ctx: MaterialExtensionContext): DeepEditingPhase {
  let currentCell: { row: number, col: number } | null = null

  function pushCellOverlay(node: TableNode, row: number, col: number) {
    const cell = node.table.rows[row].cells[col]
    const tableTypo = node.props.typography as TableTypography

    ctx.requestPropertyPanel({
      id: 'table-cell',
      title: ctx.t('designer.property.cellProperties'),
      schemas: CELL_PROP_SCHEMAS,  // fontSize, color, fontWeight, textAlign, ...
      readValue(key: string) {
        return getByPath(cell.typography ?? {}, key)
             ?? getByPath(cell, key)  // padding 等直接在 cell 上
      },
      readInheritedValue(key: string) {
        // 继承源 = 表格级 typography
        return getByPath(tableTypo ?? {}, key)
      },
      writeValue(key: string, value: unknown) {
        // 根据 key 分发到对应的 command
        const cmd = new UpdateTableCellTypographyCommand(node, row, col, { [key]: value })
        ctx.commitCommand(cmd)
      },
      clearOverride(key: string) {
        const cmd = new UpdateTableCellTypographyCommand(node, row, col, { [key]: undefined })
        ctx.commitCommand(cmd)
      },
      binding: cell.binding ?? cell.staticBinding ?? null,
      clearBinding(bindIndex?: number) {
        if (node.table.kind === 'data') {
          const cmd = new UpdateTableCellCommand(node, row, col, { binding: undefined })
          ctx.commitCommand(cmd)
        } else {
          const cmd = new ClearStaticCellBindingCommand(node, row, col)
          ctx.commitCommand(cmd)
        }
      },
      editors: {
        'cell-border': CellBorderEditor,  // 从物料包内 import
      },
    })
  }

  return {
    id: 'cell-selected',
    onEnter(containers, node) {
      // 默认选中第一个 cell 或上次记忆的 cell
      currentCell = { row: 0, col: 0 }
      pushCellOverlay(node as TableNode, 0, 0)
    },
    onExit() {
      currentCell = null
      // 不需要显式清除 overlay，面板自动处理
    },
    subSelection: {
      hitTest(point, node) {
        // hit-test cell ...
        const result = hitTestGridCell(node, point)
        if (result) {
          currentCell = result
          // 点击新 cell -> 重新推送 overlay（更新 readValue/writeValue 指向新 cell）
          pushCellOverlay(node as TableNode, result.row, result.col)
        }
        return result ? { path: result } : null
      },
      getSelectedPath() { return currentCell },
      clearSelection() { currentCell = null },
    },
    transitions: [
      { to: 'table-selected', trigger: 'escape' },
      { to: 'content-editing', trigger: 'double-click' },
    ],
  }
}
```

### CELL_PROP_SCHEMAS

```typescript
const CELL_PROP_SCHEMAS: PropSchema[] = [
  { key: 'fontSize', label: 'designer.property.fontSize', type: 'number', group: 'cell-typography', min: 1, max: 100, step: 1 },
  { key: 'color', label: 'designer.property.color', type: 'color', group: 'cell-typography' },
  { key: 'fontWeight', label: 'designer.property.fontWeight', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
  ] },
  { key: 'fontStyle', label: 'designer.property.fontStyle', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Normal', value: 'normal' },
    { label: 'Italic', value: 'italic' },
  ] },
  { key: 'textAlign', label: 'designer.property.textAlign', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
  ] },
  { key: 'verticalAlign', label: 'designer.property.verticalAlign', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Top', value: 'top' },
    { label: 'Middle', value: 'middle' },
    { label: 'Bottom', value: 'bottom' },
  ] },
  { key: 'padding', label: 'designer.property.padding', type: 'number', group: 'cell-layout', min: 0, max: 20, step: 1 },
  { key: 'border', label: 'designer.property.border', type: 'object', group: 'cell-border', editor: 'cell-border' },
]
```

---

## 数据流总结

```
物料 DeepEditingPhase                    DesignerStore                PropertiesPanel
       |                                      |                          |
       |-- onEnter / subSelection change       |                          |
       |   ctx.requestPropertyPanel(overlay) ->|                          |
       |                                       |-- _propertyOverlay ---->|
       |                                       |   (reactive)            |
       |                                       |                         |-- 渲染基础层(静态 schemas)
       |                                       |                         |-- 渲染叠加层(overlay.schemas)
       |                                       |                         |   - readValue -> 物料回调
       |                                       |                         |   - 用户修改 -> writeValue -> 物料回调 -> command
       |                                       |                         |-- BindingSection(overlay.binding)
       |                                       |                          |
       |-- phase 切换 / deep editing 退出       |                          |
       |                                       |<-- watch(deepEditing) --|
       |                                       |   setPropertyOverlay(null)
       |                                       |                         |-- 叠加层消失，恢复基础层
```

---

## 影响范围

### 需要修改的文件

| 包 | 文件 | 变更 |
|----|------|------|
| `@easyink/core` | `material-extension.ts` | `PropertyPanelRequest` -> `PropertyPanelOverlay` 类型定义 |
| `@easyink/core` | `index.ts` | 导出新类型 |
| `@easyink/designer` | `types.ts` | re-export 新类型 |
| `@easyink/designer` | `store/designer-store.ts` | 新增 `_propertyOverlay` reactive 状态 + get/set |
| `@easyink/designer` | `materials/extension-context.ts` | 实现 `requestPropertyPanel` |
| `@easyink/designer` | `components/PropertiesPanel.vue` | 叠加层渲染 + 自动清除 watch + BindingSection 上下文切换 |
| `@easyink/designer` | `components/PropSchemaEditor.vue` | 继承 placeholder + 清除按钮 + 自定义编辑器分发 |
| `@easyink/designer` | `components/BindingSection.vue` | 接受外部 binding/clearBinding props |

### 需要新增的文件

| 包 | 文件 | 说明 |
|----|------|------|
| `@easyink/core` | `commands/table.ts` (追加) | `UpdateTableCellTypographyCommand` |
| `@easyink/material-table-data` | `cell-schemas.ts` | CELL_PROP_SCHEMAS 定义 |
| `@easyink/material-table-data` | `editors/CellBorderEditor.vue` | 自定义四边边框编辑器（如需要） |
| `@easyink/material-table-static` | 同上 | 复用或独立定义 |

### 不需要修改的文件

- `@easyink/datasource` -- 数据源系统不变
- `@easyink/schema` -- TableCellSchema 已有 typography 字段（CellTypography）
- `@easyink/viewer` -- 渲染管线和绑定投影不受影响
- `DataSourcePanel.vue` -- 窗口显隐由用户手动控制，不联动

---

## 向后兼容

- `PropertyPanelRequest` (原类型) 仅在 `extension-context.ts` 中使用且原实现为空，无外部消费者
- `PropSchemaEditor` 新增的 `inheritedValue`、`canClearOverride`、`customEditors` props 均可选，默认行为不变
- `BindingSection` 新增的外部 binding/clearBinding props 可选，不传时走原有 element.binding 逻辑
- 所有现有物料注册不变，仅表格物料在 deep editing 时主动推送叠加层

---

## 约束与边界

1. **单叠加层** -- 当前设计仅支持一个 overlay（一个 deep editing context）。如果未来需要多层嵌套（如 container 内的 table 的 cell），需要扩展为 overlay stack。当前不做。
2. **仅 deep editing 上下文** -- overlay 仅在 deep editing 激活时有意义。非 deep editing 的物料不使用此机制。
3. **不替换基础层** -- overlay 始终追加在基础层下方，不支持替换模式。
4. **仅单选** -- overlay 内的属性仅反映单个 sub-selection 目标，不支持多选混合值。
5. **自定义编辑器限 Vue 组件** -- 因为面板本身是 Vue 组件，自定义编辑器也必须是 Vue 组件。物料包已依赖 Vue，无额外负担。
