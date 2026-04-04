# 8. 数据源系统

EasyInk 的数据源系统是一条独立主线，不是 Designer 的字段树配件。第一轮文档已经把它从 UI 附属物里抽出来了，第二轮修订要解决的是协议深度不够的问题。

## 8.1 目标

数据源系统要同时满足五种用途：

- 字段树展示与搜索
- 拖拽创建和拖拽绑定
- 运行时取数与预览回放
- 批量投放和多参数绑定
- 显示格式、聚合规则和推荐物料

## 8.2 规范协议

```typescript
interface DataSourceDescriptor {
  id: string
  name: string
  tag?: string
  title?: string
  icon?: string
  expand?: boolean
  headless?: boolean
  fields: DataFieldNode[]
  meta?: Record<string, unknown>
}

interface DataFieldNode {
  name: string
  key?: string
  path?: string
  title?: string
  id?: string
  tag?: string
  use?: string
  props?: Record<string, unknown>
  bindIndex?: number
  union?: DataUnionBinding[]
  expand?: boolean
  fields?: DataFieldNode[]
  meta?: Record<string, unknown>
}

interface DataUnionBinding {
  name?: string
  key?: string
  path?: string
  title?: string
  id?: string
  tag?: string
  use?: string
  offsetX?: number
  offsetY?: number
  props?: Record<string, unknown>
}
```

为什么补充 `title / id / tag`：

- 对标产品公开数据里已经出现这些字段
- 这类字段不能被当成“偶然噪音”删除，否则导入导出会丢信息
- 它们既服务字段树展示，也服务后续推荐创建和调试信息

## 8.3 对标输入与规范化

对标产品输入里，字段节点既可能只有 `name + key`，也可能额外带：

- `use`
- `props`
- `union`
- `bindIndex`
- `title`
- `id`
- `tag`

EasyInk 的做法应是：

- 用 `normalizeDataSource()` 统一把 `key` 转成规范 `path`
- 保留原始字段到 `meta` 或兼容态，而不是静默丢掉
- 对仅有 `key` 的节点，规范路径默认取 `key`

## 8.4 字段语义

| 字段 | 语义 | 用途 |
| --- | --- | --- |
| `id` | 数据源或字段的稳定标识 | 绑定、诊断、缓存 |
| `name` | 主要展示名称 | 字段树、属性面板 |
| `title` | 备选展示名或分组标题 | 字段树说明、批量投放标题 |
| `tag` | 数据接口或数据源类别标识 | 运行时适配器匹配 |
| `key` | 原始字段 key | 导入兼容 |
| `path` | 规范路径 | 绑定、运行时解析 |
| `use` | 推荐物料或物料模板 token | 拖拽创建 |
| `props` | 创建默认属性 | 拖拽创建 |
| `union` | 一拖多投放方案 | 批量生成 |
| `bindIndex` | 多参数绑定位次 | BWIP、函数、公式等 |
| `expand` | 默认展开状态 | 字段树 UI |
| `headless` | 不作为独立显示根节点 | UI/兼容 |

## 8.5 `use` 不是注释，而是物料推荐协议

`use` 的职责是告诉 Designer：当用户拖拽这个字段到画布或空白区时，优先创建什么物料。

推荐做法：

```typescript
type MaterialUseToken =
  | 'text'
  | 'image'
  | 'barcode'
  | 'qrcode'
  | 'rich-text'
  | 'chart/*'
  | 'svg/*'
  | 'relation/*'
  | string
```

说明：

- EasyInk 内部要支持明确的 use registry
- 对标产品里的历史 token 可以原样导入，但必须通过 registry 映射到 EasyInk 物料定义
- 不能把 `use` 当成一段任意脚本或任意组件路径

## 8.6 批量投放 `union`

参考对标产品的 `receipt` 示例，字段节点可声明 `union`：

- 主字段拖拽时先创建主元素
- `union` 子项按相对偏移继续创建附属元素
- 每个子项可带自己的推荐物料和默认 props

```typescript
const receiptField: DataFieldNode = {
  name: '基础数据批量添加',
  path: 'base/name',
  use: 'text',
  props: { width: 240, height: 30, size: 18 },
  union: [
    {
      name: '创建时间',
      path: 'base/time',
      use: 'text',
      offsetX: 0,
      offsetY: 40,
      props: { width: 150, height: 20 },
    },
    {
      name: '收银员',
      path: 'base/cashier',
      use: 'text',
      offsetX: 160,
      offsetY: 40,
      props: { width: 80, height: 20 },
    },
  ],
}
```

设计约束：

- `union` 是数据源协议的一部分，不是某个物料包的私有技巧
- 偏移量以主元素左上角为参照坐标系
- 默认 props 只提供创建初值，不覆盖用户后续编辑结果

## 8.7 多参数绑定 `bindIndex`

参考 BWIP 示例，一个字段组可服务同一个物料的多个输入槽位：

- 内容
- 格式
- 参数

```typescript
const bwipFields: DataFieldNode[] = [
  { name: 'BWIP内容', path: 'text', use: 'barcode', bindIndex: 0 },
  { name: 'BWIP格式', path: 'format', use: 'barcode', bindIndex: 1 },
  { name: 'BWIP参数', path: 'params', use: 'barcode', bindIndex: 2 },
]
```

设计约束：

- `bindIndex` 只解决“同一个物料有多个数据输入”的问题
- 绑定顺序必须稳定，不能依赖字段树视觉顺序推断
- 属性面板需要能可视化当前槽位的绑定关系

## 8.8 绑定引用与字段树分离

字段树不整体写入 Schema，但绑定会保存引用元数据：

- `sourceId`
- `sourceTag`
- `fieldPath`
- `fieldLabel`
- `usage`
- `bindIndex`

也就是说：

- Designer 通过字段树帮助绑定
- 模板通过绑定引用保持可回放性
- Viewer 通过 `sourceId / sourceTag` 找到实际数据适配器

## 8.9 数据适配器

Viewer 不应该假设数据一定是一个已经预处理好的扁平对象。它应该允许宿主接入适配器：

```typescript
interface DataAdapter {
  id: string
  match(source: DataSourceDescriptor): boolean
  load(source: DataSourceDescriptor, context: DataLoadContext): Promise<unknown>
}
```

这让 EasyInk 可以支持：

- 本地 mock 数据
- HTTP 请求
- 业务端传入内存对象
- 模板库样例数据
- 预览器 iframe 中的独立数据加载

## 8.10 路径与格式规则

### 路径规则

- 规范路径分隔符使用 `/`
- 导入层兼容 `.` 路径和仅 `key` 的老格式
- 对数组字段，集合节点路径指向集合本身，子字段路径指向相对字段
- 容器、对象、数组都可以通过嵌套路径表达

### 格式规则

- `usage` 表达数字格式化、前后缀、日期格式、聚合等安全声明式能力
- 不支持模板内直接写任意脚本

## 8.11 data-table 绑定约束

`data-table` 绑定不再是“列自己随便绑”，而要遵守结构约束：

- 表格必须明确主数据源
- 数据区行绑定到集合字段
- 单元格绑定相对字段或聚合字段
- 合计区绑定聚合规则，而不是冒充普通字段
- 结构树中的嵌套单元格元素，绑定路径默认相对当前行上下文解析

## 8.12 Designer 与 Viewer 共享协议

新的原则是：

- Designer 不独占数据源协议
- Viewer 不绕开数据源协议

这样才能保证：

- 设计时看到的字段树与预览时加载的数据是一致的
- 模板在脱离 Designer 后仍能独立回放
- `union`、`bindIndex`、`use` 不会只在设计态存在、运行态失真
