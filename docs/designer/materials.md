# 自定义物料开发

物料是文档中的可编辑元素类型。EasyInk 的每个内置物料（文本、图片、条码等）都由四部分组成：Schema 定义、Designer 交互、Viewer 渲染、目录注册。

## 注册物料

通过 `registerMaterialBundle` 批量注册自定义物料：

```ts
import { registerMaterialBundle } from '@easyink/designer'

function onSetupStore(store) {
  registerMaterialBundle(store, {
    materials: [/* 物料定义 */],
    quickMaterialTypes: ['my-widget'],
    groupedCatalog: [{ type: 'my-widget', group: 'utility' }],
  })
}
```

```vue
<EasyInkDesigner
  v-model:schema="schema"
  :setup-store="onSetupStore"
/>
```

## DesignerMaterialRegistration

每个物料定义包含以下字段：

```ts
interface DesignerMaterialRegistration {
  type: string                    // 物料类型标识，如 'text'、'image'
  name: string                    // 显示名称
  icon: string                    // 图标标识
  category: string                // 分类：'basic' | 'container' | 'data' | 'chart' | 'other'
  capabilities: MaterialCapabilities  // 能力声明
  createDefaultNode: (input) => MaterialNode  // 创建默认节点
  factory: MaterialExtensionFactory   // Designer 扩展工厂
  propSchemas?: PropSchema[]      // 属性 Schema 定义
  sectionFilter?: (sectionId) => boolean  // 属性面板 section 过滤器
}
```

## 能力声明（MaterialCapabilities）

通过 `capabilities` 声明物料支持的交互能力：

```ts
interface MaterialCapabilities {
  bindable?: boolean           // 可绑定数据
  rotatable?: boolean          // 可旋转
  resizable?: boolean          // 可缩放
  supportsChildren?: boolean   // 支持子元素（容器类物料）
  supportsAnimation?: boolean  // 支持动画
  supportsUnionDrop?: boolean  // 支持联合拖放
  pageAware?: boolean          // 跨页元素（如页码）
  multiBinding?: boolean       // 支持多绑定
  keepAspectRatio?: boolean    // 缩放时保持宽高比
}
```

Designer 根据这些标志决定是否显示旋转手柄、缩放手柄、绑定区域等 UI。

## createDefaultNode

定义拖放到画布时创建的默认节点结构：

```ts
createDefaultNode: (input) => ({
  id: generateId(),
  type: 'my-widget',
  x: 0,
  y: 0,
  width: 120,
  height: 40,
  props: {
    content: '默认文本',
    fontSize: 14,
    fontFamily: 'sans-serif',
    color: '#000000',
  },
  ...input,
})
```

`input` 参数包含用户通过数据源拖放传入的初始属性（如 `binding`）。

## factory（Designer 扩展工厂）

返回一个 `DesignerExtension` 对象，定义物料在设计器中的行为：

```ts
factory: (ctx) => ({
  // 双击进入深度编辑时的处理
  onDoubleClick: (node, session) => {
    session.startEditing(node.id)
  },

  // 自定义属性面板（可选）
  renderPropertyPanel: (node) => MyPropertyPanel,
})
```

## propSchemas（属性 Schema）

定义物料在属性面板中展示的可编辑属性：

```ts
propSchemas: [
  {
    key: 'content',
    label: '内容',
    type: 'text',
    defaultValue: '',
  },
  {
    key: 'fontSize',
    label: '字号',
    type: 'number',
    defaultValue: 14,
    min: 6,
    max: 72,
  },
  {
    key: 'color',
    label: '颜色',
    type: 'color',
    defaultValue: '#000000',
  },
]
```

## 目录分组

物料在物料面板中的展示分两层：

- **快捷物料**（`quickMaterialTypes`）：直接显示在物料栏顶部
- **分组目录**（`groupedCatalog`）：按 group 分组展示在下拉菜单中

```ts
{
  quickMaterialTypes: ['text', 'image', 'table-data'],
  groupedCatalog: [
    { type: 'barcode', group: 'data' },
    { type: 'qrcode', group: 'data' },
    { type: 'line', group: 'shape' },
    { type: 'rect', group: 'shape' },
  ],
}
```

## Viewer 渲染

物料还需要注册 Viewer 渲染器，详见 [Viewer 自定义物料](/viewer/custom-materials)。
