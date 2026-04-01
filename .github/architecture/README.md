# EasyInk Architecture

> 前端打印模板设计器库 -- 基于 Vue 3 + TypeScript + pnpm monorepo

本目录包含 EasyInk 的完整技术架构文档。2026-04-01 起，架构方向已收敛为：

- 运行时只保留 DOM 渲染与简单字段绑定
- 表达式、内建打印/PDF/图片导出不再属于核心承诺
- 复杂展示值由业务方在渲染前预装配
- 布局采用坐标驱动 + 按 y 排序的整体推移模型

## 目录

| # | 文档 | 说明 |
|---|------|------|
| 1 | [项目概览](./01-overview.md) | 设计原则、职责边界、技术栈 |
| 2 | [核心场景](./02-core-scenarios.md) | 适用/不适用场景 |
| 3 | [Monorepo 包结构](./03-monorepo-structure.md) | 包拆分、依赖关系、消费方式 |
| 4 | [分层架构](./04-layered-architecture.md) | 四层架构图、API 暴露风格 |
| 5 | [Schema DSL 设计](./05-schema-dsl.md) | 顶层结构、页面设置、物料节点、数据绑定 |
| 6 | [渲染管线](./06-render-pipeline.md) | 统一 DOM 渲染、溢出诊断、输出边界 |
| 7 | [布局引擎](./07-layout-engine.md) | 坐标推移布局模型、计算流程 |
| 8 | [数据源系统](./08-datasource.md) | 开发方注册、字段树、运行时数据契约 |
| 9 | [运行时数据预装配](./09-expression-engine.md) | 展示值前置装配、字段边界、非目标 |
| 10 | [内部扩展机制](./10-plugin-system.md) | 仓库内扩展点、上下文 API、钩子体系 |
| 11 | [设计器交互层](./11-designer-interaction.md) | 组件结构、交互特性、画布预览、属性面板 |
| 12 | [物料体系](./12-element-system.md) | 物料类型定义、PropSchema、交互策略、内置物料 |
| 13 | [Command 与撤销/重做](./13-command-undo-redo.md) | Command 模式、命令管理器、内置命令 |
| 14 | [单位系统](./14-unit-system.md) | 单位存储、转换、渲染时转换公式 |
| 15 | [字体管理](./15-font-management.md) | FontProvider 接口、FontManager |
| 16 | [输出链路边界](./16-pdf-pipeline.md) | DOM 输出职责、外部打印/PDF/image 扩展边界 |
| 17 | [国际化](./17-i18n.md) | 外部化 + 默认中文 |
| 18 | [Schema 版本迁移](./18-schema-migration.md) | SemVer 语义、迁移注册表 |
| 19 | [构建与产物](./19-build-artifacts.md) | 构建工具链、产物格式、导出配置 |
| 20 | [测试策略](./20-testing.md) | 单元测试、E2E 测试 |
| 21 | [性能策略](./21-performance.md) | 架构层预留、性能目标 |
| 22 | [安全模型](./22-security.md) | 数据路径安全、富文本安全、渲染安全 |
| 23 | [关键设计决策记录](./23-design-decisions.md) | 历史 ADR + 2026-04-01 收敛增补 |

## 实施规划

| 文档 | 说明 |
|------|------|
| [物料体系重构阶段规划](./phase.md) | Element→Material 全栈重命名 + 物料面板/交互策略/PropSchema 等实施步骤 |

## 快速导航

- **想了解项目定位?** -> [01-overview](./01-overview.md) + [02-core-scenarios](./02-core-scenarios.md)
- **想了解代码结构?** -> [03-monorepo-structure](./03-monorepo-structure.md) + [04-layered-architecture](./04-layered-architecture.md)
- **想了解数据与渲染边界?** -> [05-schema-dsl](./05-schema-dsl.md) + [06-render-pipeline](./06-render-pipeline.md) + [08-datasource](./08-datasource.md)
- **想了解布局模型?** -> [07-layout-engine](./07-layout-engine.md)
- **想了解设计器 UI?** -> [11-designer-interaction](./11-designer-interaction.md)
- **想了解物料拖拽与交互策略?** -> [12-element-system](./12-element-system.md) + [11-designer-interaction](./11-designer-interaction.md)
- **想了解输出职责边界?** -> [06-render-pipeline](./06-render-pipeline.md) + [16-pdf-pipeline](./16-pdf-pipeline.md)
- **想了解历史决策?** -> [23-design-decisions](./23-design-decisions.md)
