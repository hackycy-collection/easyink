# 4. 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Consumer Application                  │
├─────────────────────────────────────────────────────────┤
│  @easyink/designer  (Vue 组件 + Composables)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  设计器 UI：画布、工具栏、属性面板、图层面板      │   │
│  │  交互层：拖拽、对齐、选择、缩放、旋转            │   │
│  │  数据源面板：开发方注册的字段树、数据绑定 UI      │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  @easyink/renderer  (DOM 渲染)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  DOMRenderer：Schema + data → DOM 节点树         │   │
│  │  MeasureLayer：文本/表格测量、溢出诊断           │   │
│  │  MaterialRendererRegistry：物料渲染函数注册表     │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  @easyink/core  (框架无关的核心引擎)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  SchemaEngine：Schema CRUD、校验、遍历           │   │
│  │  LayoutEngine：坐标推移布局计算                  │   │
│  │  DataSourceManager：字段树注册、路径解析          │   │
│  │  PluginManager：内部扩展点、生命周期管理          │   │
│  │  CommandManager：撤销/重做栈                     │   │
│  │  UnitManager：单位存储与转换                     │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  @easyink/shared  (类型 + 工具)                       │
└─────────────────────────────────────────────────────────┘
```

## 职责切分

- `@easyink/core` 负责描述模板、解析绑定、计算布局，不承担表达式求值和导出链路。
- `@easyink/renderer` 只负责把 Schema 渲染为 DOM，并报告测量结果与溢出状态。
- `Consumer Application` 负责准备展示值数据，并基于 DOM 自行决定打印、导出 PDF 或图片。
- `@easyink/designer` 负责让设计器记录字段来源和静态属性，不在设计时填充真实数据。

## API 暴露风格：混合模式

核心层使用 Class 实例管理状态和生命周期，Vue 层提供 Composable 封装：

```typescript
// --- Core 层：Class 实例 ---
import { EasyInkEngine } from '@easyink/core'
import { DOMRenderer } from '@easyink/renderer'

const engine = new EasyInkEngine({
  schema: loadedSchema,
})

engine.on('schema:change', (schema) => { /* ... */ })

const renderer = new DOMRenderer({ engine })
const result = renderer.render(loadedSchema, preparedDisplayData, container)

if (result.overflowed) {
  console.warn('template content exceeds declared paper height')
}

// --- Vue 层：Composable 封装 ---
import { useDesigner } from '@easyink/designer'

const {
  canvas,
  selected,
  schema,
  undo,
  redo,
} = useDesigner({
  schema: initialSchema,
})
```
