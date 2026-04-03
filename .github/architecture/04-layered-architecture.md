# 4. 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Consumer Application                  │
├─────────────────────────────────────────────────────────┤
│  @easyink/designer  (Vue 组件 + Composables)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Workbench：顶部双栏、Logo、物料栏、系统操作栏    │   │
│  │  Workspace：画布、浮动窗口、窗口状态、偏好持久化  │   │
│  │  交互层：拖拽、对齐、选择、缩放、旋转、绑定       │   │
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
│  │  CommandManager：撤销/重做栈                     │   │
│  │  UnitManager：单位存储与转换                     │   │
│  │  MaterialTypeDefinition / MaterialRegistry       │   │
│  │  MigrationRegistry                               │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  @easyink/shared  (类型 + 工具)                       │
└─────────────────────────────────────────────────────────┘
```

## 职责切分

- `@easyink/core` 负责描述模板、计算布局，不承担模板动态计算、导出链路和数据源管理。
- `@easyink/renderer` 只负责把 Schema 渲染为 DOM，并报告测量结果与溢出状态；它必须可以在不引入设计器的前提下单独消费。renderer 直接依赖所有内置物料包，消费者无需手动注册物料。
- `Consumer Application` 负责准备展示值数据，并基于 DOM 自行决定打印、导出 PDF 或图片。
- `@easyink/designer` 负责提供开箱即用且默认美观的设计工作台，记录字段来源和静态属性，不在设计时填充真实数据。designer 同样直接依赖所有内置物料包。数据源字段树注册在 designer 层完成。
- 设计器中的窗口显示/隐藏、位置、激活态、最小化状态属于工作台偏好，不进入 Schema，也不进入撤销/重做栈。
- 设计器画布不执行推移布局，所有物料按声明坐标绝对定位；推移仅在运行时渲染器中生效。

## 4.1 外部稳定面

近两版对外只稳定最小消费面：

- `@easyink/core` 的 Schema 加载、迁移与基础遍历能力
- `@easyink/renderer` 的最小 DOM 渲染入口与诊断事件流
- `@easyink/designer` 的基础设计器入口

以下能力继续视为仓库内可演进抽象，不承诺近期稳定兼容：

- `TemplateSchema` 的外部手写 DSL 语义
- `PropSchema` 的函数式协议细节
- 自定义编辑器注册、内部插件钩子、第三方物料包契约

## 设计器工作台子层

`@easyink/designer` 在 UI 层内进一步拆为三个协作子层：

- `WorkbenchChrome`：顶部双栏结构。左侧承载 Logo 与物料栏，右侧承载撤销、重做、删除、缩放以及各工作台窗口开关，默认采用高密度 Icon 按钮。
- `CanvasWorkspace`：画布所在的主工作区，窗口仅允许在该区域内浮动与拖拽，不覆盖顶部栏。
- `WorkspaceWindowSystem`：统一窗口壳层，承载属性、页面设置、结构树、数据源、历史记录、快捷帮助等操作面板；支持标题栏拖拽、点击置顶、最小化与关闭后重开。

## API 暴露风格

### Renderer：工厂函数 + async render

```typescript
import { createRenderer } from '@easyink/renderer'

const renderer = createRenderer({
  fontProvider: myFontProvider, // 可选
})

// render() 是 async 方法，等待所有资源（字体、图片）加载后返回
// 单个资源加载失败不阻断，通过 onDiagnostic 回调通知
const result = await renderer.render(schema, preparedDisplayData, container, {
  onDiagnostic: (event) => {
    console.warn(`[${event.phase}] ${event.code}`, event)
  },
})

if (result.overflowed) {
  console.warn('template content exceeds declared paper height')
}

// 使用完毕后释放
result.dispose()
renderer.destroy()
```

**设计要点：**

- `createRenderer()` 返回轻量只读配置实例，无可变全局状态，可安全创建多个实例并发渲染
- 所有内置物料渲染函数已自动包含，消费者无需手动注册
- `render()` 返回 `Promise<RenderResult>`，内部依次完成：资源加载 -> 离屏 DOM 测量 -> 布局计算 -> 最终 DOM 渲染
- diagnostic 通过 `render()` 参数中的 `onDiagnostic` 回调逐条发出
- 渲染器使用 CSS mm 物理单位直出 DOM，并自动注入 `@page { size }` 打印样式
- 样式隔离采用局部 `<style>` + 哈希前缀 + 内联样式，不使用 Shadow DOM

### Designer：Vue 组件

```vue
<template>
  <EasyInkDesigner
    v-model:schema="schema"
    :data-sources="dataSources"
    :font-provider="fontProvider"
    :preference-provider="preferenceProvider"
    :locale="locale"
  />
</template>

<script setup>
import { EasyInkDesigner } from '@easyink/designer'
import { ref } from 'vue'

const schema = ref(initialSchema)
const dataSources = [
  {
    displayName: '订单数据',
    fields: [ /* DataFieldNode[] */ ],
  },
]
</script>
```

**设计要点：**

- 设计器对外暴露为 Vue 组件 `<EasyInkDesigner />`
- Schema 通过 `v-model:schema` 双向绑定，设计器内部修改 Schema 后自动通知消费者
- 数据源字段树通过 `dataSources` prop 传入（从 core/Engine 层移入 designer 层）
- 所有内置物料定义、交互策略、渲染函数已自动包含
- 设计器使用 Shadow DOM 做样式隔离
- 画布不执行推移布局，纯坐标绝对定位
- 工作台偏好通过 PreferenceProvider 接口由消费者实现持久化

### PreferenceProvider 接口

```typescript
interface PreferenceProvider {
  load(): Promise<WorkspacePreferences | null>
  save(state: WorkspacePreferences): Promise<void>
}

interface WorkspacePreferences {
  windows: WorkspaceWindowState[]
  activeWindowId?: string
}
```
