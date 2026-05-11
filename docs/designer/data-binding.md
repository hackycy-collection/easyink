# 数据绑定

数据绑定将 Schema 中的元素属性连接到运行时数据。用户通过拖拽数据源字段到元素上完成绑定，Viewer 渲染时自动填充数据。

## 数据源定义

通过 `DataSourceDescriptor` 描述可用的数据字段树：

```ts
import type { DataSourceDescriptor } from '@easyink/designer'

const dataSources: DataSourceDescriptor[] = [{
  id: 'order',
  name: '订单数据',
  fields: [
    { path: 'orderNo', title: '订单号' },
    { path: 'customer.name', title: '客户名称' },
    { path: 'customer.phone', title: '联系电话' },
    { path: 'items', title: '商品列表', fields: [
      { path: 'items[].name', title: '商品名称' },
      { path: 'items[].qty', title: '数量' },
      { path: 'items[].price', title: '单价' },
    ]},
    { path: 'qrcode', title: '二维码' },
  ],
}]
```

### DataFieldNode 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 字段内部名称 |
| `path` | `string` | 数据路径，如 `customer.name` 或 `items[].name` |
| `title` | `string` | 显示名称（在数据源面板中展示） |
| `fields` | `DataFieldNode[]` | 子字段（用于嵌套对象或数组） |
| `use` | `MaterialUseToken` | 推荐使用的物料类型 |
| `props` | `Record<string, unknown>` | 拖放时附加到元素的默认属性 |
| `format` | `BindingDisplayFormat` | 格式化规则 |
| `bindIndex` | `number` | 绑定索引（多绑定时区分主/次绑定） |
| `union` | `DataUnionBinding[]` | 联合绑定（一次拖放绑定多个属性） |

## 传递数据源

```vue
<EasyInkDesigner
  v-model:schema="schema"
  :data-sources="dataSources"
/>
```

Designer 会将数据源渲染到左侧数据源面板，用户可以展开字段树并拖拽到画布元素上。

## 绑定流程

1. 用户从数据源面板拖拽字段到画布元素
2. Designer 根据字段的 `use` 属性自动选择合适的物料类型（如有配置）
3. 元素的 `binding` 属性记录数据源 ID 和字段路径
4. 用户保存模板后，绑定信息持久化在 Schema 中

## 运行时解析

Viewer 渲染时，`projectBindings()` 函数解析每个元素的绑定：

- 根据 `binding.sourceId` 查找数据源
- 根据 `binding.path` 从运行时数据中提取值
- 主绑定（bindIndex 0）映射到物料的主属性（如 text -> `content`，image -> `src`）
- 多绑定时按 bindIndex 映射到不同属性

## 从 JSON 自动生成数据源

如果你的数据是 JSON 对象，可以递归转换为 `DataSourceDescriptor`：

```ts
function jsonToDataSource(data: Record<string, unknown>, id = 'data'): DataSourceDescriptor {
  const fields = Object.entries(data).map(([key, value]) => ({
    path: key,
    title: key,
    ...(typeof value === 'object' && value !== null
      ? { fields: /* 递归处理 */ }
      : {}),
  }))
  return { id, name: id, fields }
}
```

Playground 中的 `playground/src/utils/json-to-datasource.ts` 提供了完整的实现，自动推断 `image` 和 `text` 类型。
