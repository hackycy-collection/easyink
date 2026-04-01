# 3. Monorepo 包结构

采用**基础包粗粒度 + 物料包细粒度**的混合拆分策略。基础设施包（core/renderer/designer/ui/shared）保持粗粒度；物料包作为内部抽象单元独立组织，先服务仓库内实现，暂不把第三方物料包契约视为稳定公共 API。

```
easyink/
├── packages/
│   ├── core/                  # @easyink/core — 框架无关的核心引擎
│   │   ├── src/
│   │   │   ├── schema/        # Schema 定义、校验、操作
│   │   │   ├── engine/        # 布局引擎（坐标推移）
│   │   │   ├── datasource/    # 字段树注册、路径解析
│   │   │   ├── plugin/        # 内部扩展点、钩子体系
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
│   │   │   ├── components/    # 设计器 Vue 组件（画布、物料栏、属性面板...）
│   │   │   ├── composables/   # Vue Composable 封装
│   │   │   ├── interaction/   # InteractionStrategyRegistry + 基础设施
│   │   │   ├── panels/        # 属性面板、图层面板、数据源面板
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
  },
  "peerDependencies": {
    "@easyink/renderer": "workspace:*",
    "@easyink/designer": "workspace:*"
  },
  "peerDependenciesMeta": {
    "@easyink/renderer": { "optional": true },
    "@easyink/designer": { "optional": true }
  }
}
```

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
@easyink/core             ← 依赖 shared；核心逻辑层（含 MaterialRegistry，不含内置物料）
    ↑
@easyink/renderer         ← 依赖 core + shared；DOM 渲染层（含 MaterialRendererRegistry）
    ↑
@easyink/ui               ← 依赖 shared；内部 UI 组件库（不对外导出）
    ↑
@easyink/designer         ← 依赖 core + renderer + ui + shared；设计器 UI（含 InteractionStrategyRegistry）

@easyink/icons            ← 独立包；Iconify 离线图标数据

@easyink/material-*       ← 物料独立包（每种物料一个包）
    依赖: core + shared
    可选 peer: renderer（render 子路径）、designer（designer 子路径）
    注意: core/renderer/designer 不依赖 material-*，避免循环依赖
```

**依赖方向（单向，无循环）：**

```
            shared
              ↑
            core  ←────────────── material-* (definition + props)
              ↑                         ↑ (render 子路径 peer dep)
           renderer ←──────────── material-*/render
              ↑                         ↑ (designer 子路径 peer dep)
  ui ──→ designer ←──────────── material-*/designer
              ↑
           icons
```

## 消费方式

```typescript
// 1. 只需 DOM 渲染（按需引入物料）
import { createRenderer } from '@easyink/renderer'
import { textDefinition } from '@easyink/material-text'
import { textRender } from '@easyink/material-text/render'

// 2. 需要设计器（按需引入物料 + 交互策略）
import { createDesigner } from '@easyink/designer'
import { textDefinition } from '@easyink/material-text'
import { textRender } from '@easyink/material-text/render'
import { textInteraction } from '@easyink/material-text/designer'

// 3. 只需操作 Schema
import { MaterialRegistry } from '@easyink/core'
import { textDefinition } from '@easyink/material-text'
```

- `@easyink/ui` 和 `@easyink/icons` 为内部包，对外发布但不公开文档
- `@easyink/material-*` 当前首先服务仓库内实现；第三方物料开放能力后续再稳定契约
