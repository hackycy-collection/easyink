# 3. Monorepo 包结构

采用**基础包粗粒度 + 物料包细粒度**的混合拆分策略。基础设施包（core/renderer/designer/ui/shared）保持粗粒度；物料包作为内部抽象单元独立组织，先服务仓库内实现，暂不把第三方物料包契约视为稳定公共 API。

```
easyink/
├── packages/
│   ├── core/                  # @easyink/core — 框架无关的核心引擎
│   │   ├── src/
│   │   │   ├── schema/        # Schema 定义、校验、操作
│   │   │   ├── engine/        # 布局引擎（坐标推移）
│   │   │   ├── command/       # Command 模式、撤销/重做栈
│   │   │   ├── units/         # 单位系统、转换工具
│   │   │   ├── materials/     # MaterialRegistry + 基础类型（不含内置物料定义）
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── renderer/              # @easyink/renderer — DOM 渲染器
│   │   ├── src/
│   │   │   ├── dom/           # DOM 渲染核心 + MaterialRendererRegistry
│   │   │   ├── measure/       # 文本/表格测量、溢出诊断
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── designer/              # @easyink/designer — 可视化设计器 Vue 组件
│   │   ├── src/
│   │   │   ├── components/    # 设计器 Vue 组件（顶部栏、画布、窗口壳层...）
│   │   │   ├── composables/   # Vue Composable 封装
│   │   │   ├── interaction/   # InteractionStrategyRegistry + 基础设施
│   │   │   ├── datasource/    # 数据源字段树管理、拖拽绑定
│   │   │   ├── workspace/     # WorkspaceLayout、WindowManager、偏好持久化
│   │   │   ├── windows/       # 属性/页面/结构树/数据源/历史等窗口内容
│   │   │   ├── locale/        # 默认中文语言包
│   │   │   ├── theme/         # CSS 变量主题
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── materials/             # 物料独立包目录（仓库内抽象）
│   │   ├── text/
│   │   ├── rich-text/
│   │   ├── image/
│   │   ├── rect/
│   │   ├── line/
│   │   ├── barcode/
│   │   ├── data-table/
│   │   └── table/
│   │
│   ├── ui/                    # @easyink/ui — 内部 UI 组件库
│   │   ├── src/
│   │   │   ├── components/    # 表单编辑器组件（Input/Select/ColorPicker/Switch...）
│   │   │   ├── styles/        # 统一样式规范（CSS 变量主题）
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── icons/                 # @easyink/icons — Iconify 图标打包（离线）
│   │   └── package.json
│   │
│   └── shared/                # @easyink/shared — 共享工具与类型
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── index.ts
│       └── package.json
│
├── playground/
├── examples/
├── docs/
└── e2e/
```

### 物料包内部结构（以 `@easyink/material-text` 为例）

每个物料包采用**三层子路径导出**，确保各层只引入所需依赖：

```
packages/materials/text/
├── src/
│   ├── index.ts              # 统一导出（定义 + props）
│   ├── definition.ts         # MaterialTypeDefinition（核心元信息）
│   ├── props.ts              # PropSchema[]（属性 Schema 定义）
│   ├── render.ts             # MaterialRenderFunction（DOM 渲染函数）
│   └── interaction.ts        # InteractionStrategy（设计器交互策略）
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

**package.json exports 配置：**

```jsonc
{
  "name": "@easyink/material-text",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    },
    "./render": {
      "import": "./dist/render.mjs",
      "types": "./dist/render.d.mts"
    },
    "./designer": {
      "import": "./dist/interaction.mjs",
      "types": "./dist/interaction.d.mts"
    }
  },
  "dependencies": {
    "@easyink/core": "workspace:*",
    "@easyink/shared": "workspace:*"
  }
}
```

> **2026-04-02 变化**：物料包不再声明 renderer/designer 为 peerDependency。renderer 和 designer 直接依赖物料包并内部导入渲染函数/交互策略。

**三层导出说明：**

| 导出路径 | 内容 | 依赖 | 使用场景 |
|---------|------|------|---------|
| `@easyink/material-text` | MaterialTypeDefinition + PropSchema[] | core + shared | 只需 Schema 操作 |
| `@easyink/material-text/render` | MaterialRenderFunction | core + shared + renderer | 需要 DOM 渲染 |
| `@easyink/material-text/designer` | InteractionStrategy | core + shared + designer + ui | 设计器交互 |

### pnpm-workspace.yaml

```yaml
packages:
  - playground
  - docs
  - packages/*
  - packages/materials/*
  - examples/*
```

## 包依赖关系

```
@easyink/shared           ← 无依赖，纯工具与类型
    ↑
@easyink/core             ← 依赖 shared；核心逻辑层（含 MaterialRegistry，不含内置物料，不含 DataSourceManager）
    ↑
@easyink/material-*       ← 物料独立包（每种物料一个包）
    依赖: core + shared
    内部代码组织单元，保留三层子路径导出，不推荐消费者直接使用
    ↑
@easyink/renderer         ← 依赖 core + shared + 所有 material-*；DOM 渲染层（内置所有物料渲染函数）
    ↑
@easyink/ui               ← 依赖 shared；内部 UI 组件库（不对外导出）
    ↑
@easyink/designer         ← 依赖 core + renderer + ui + icons + shared + 所有 material-*；设计器 UI（含数据源管理、交互策略）

@easyink/icons            ← 独立包；Iconify 离线图标数据
```

**依赖方向（单向，无循环）：**

```
            shared
              ↑
            core  ←───────── material-* (definition + props)
              ↑                   ↑
           renderer ←─────── material-*/render
              ↑                   ↑
  ui ──→ designer ←─────── material-*/designer
              ↑
           icons
```

**关键变化（2026-04-02 收敛）：**

- renderer 和 designer 直接依赖所有内置物料包，消费者无需手动注册
- material-* 的 render 子路径不再 peer dep renderer（消除循环依赖风险）
- DataSourceManager 从 core 移入 designer
- v1 不支持自定义物料扩展

## 消费方式

```typescript
// 1. 只需 DOM 渲染（所有内置物料自动包含，无需手动注册）
import { createRenderer } from '@easyink/renderer'

const renderer = createRenderer({ fontProvider: myFontProvider })
const result = await renderer.render(schema, data, container)

// 2. 需要设计器（所有内置物料自动包含）
import { EasyInkDesigner } from '@easyink/designer'
// 在 Vue 模板中：
// <EasyInkDesigner v-model:schema="schema" :data-sources="dataSources" />
```

- `@easyink/ui` 和 `@easyink/icons` 为内部包，对外发布但不公开文档
- `@easyink/material-*` 为内部代码组织单元，保留三层子路径导出，不推荐消费者直接使用
- v1 不支持自定义物料扩展；第三方物料开放能力后续再稳定契约
