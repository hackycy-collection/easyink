# EasyInk Architecture

> 前端打印模板设计器库 -- 基于 Vue 3 + TypeScript + pnpm monorepo

本目录包含 EasyInk 的完整技术架构文档。2026-04-01 起，架构方向已收敛为：

- 运行时只保留 DOM 渲染与简单字段绑定
- 动态计算、内建打印/PDF/图片导出不再属于核心承诺
- 复杂展示值由业务方在渲染前预装配
- 布局采用坐标驱动 + 按 y 排序的整体推移模型（设计器不做推移，纯坐标定位）
- 渲染器根据 `page.unit` 直出对应 CSS 物理单位（mm/pt/in）DOM，async render 等待全部资源后返回
- renderer/designer 内置所有内置物料，消费者无需手动注册
- 数据源注册从 core 层移入 designer 层

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
| 9 | [内部扩展机制](./09-plugin-system.md) | 仓库内扩展点、上下文 API、钩子体系 |
| 10 | [设计器交互层](./10-designer-interaction.md) | 工作台布局、窗口系统、画布预览、属性编辑 |
| 11 | [物料体系](./11-element-system.md) | 物料类型定义、PropSchema、交互策略、内置物料 |
| 12 | [Command 与撤销/重做](./12-command-undo-redo.md) | Command 模式、命令管理器、内置命令 |
| 13 | [单位系统](./13-unit-system.md) | 单位存储、转换、渲染时转换公式 |
| 14 | [字体管理](./14-font-management.md) | FontProvider 接口、FontManager |
| 15 | [输出链路边界](./15-pdf-pipeline.md) | DOM 输出职责、外部打印/PDF/image 扩展边界 |
| 16 | [国际化](./16-i18n.md) | 外部化 + 默认中文 |
| 17 | [Schema 版本迁移](./17-schema-migration.md) | SemVer 语义、迁移注册表 |
| 18 | [构建与产物](./18-build-artifacts.md) | 构建工具链、产物格式、导出配置 |
| 19 | [测试策略](./19-testing.md) | 单元测试、E2E 测试 |
| 20 | [性能策略](./20-performance.md) | 架构层预留、性能目标 |
| 21 | [安全模型](./21-security.md) | 数据路径安全、富文本安全、渲染安全 |
| 22 | [关键设计决策记录](./22-design-decisions.md) | 历史 ADR + 2026-04-01 收敛增补 |

## 补充说明

- `TemplateSchema` 是内部持久化格式，面向保存与复用，不承诺为外部手写 DSL 合同
- 未识别物料、自定义编辑器缺失时采用只读占位降级，并保留原始 Schema 数据
- 绑定缺失在设计器中继续显示占位标签，运行时统一渲染空白并输出非阻断诊断
- 旋转后的物料以 AABB 参与推移与溢出判断；`lockedPosition` 冲突只做诊断不自动让位
- `children`/容器能力在 v1 仅作接口预留，不作为正式通用能力
- 外部图片、背景图、字体等资源只保存引用；上传、缓存、离线和失效恢复不属于框架职责
- Schema 加载默认最大化可打开；仅顶层结构损坏或恶意路径触发拒绝加载
- 高于当前库版本的 Schema 采用 best-effort 打开并给出诊断，而不是直接拒绝
- 运行时 diagnostics 通过 `render()` 参数中的 `onDiagnostic` 回调逐条发出；`render()` 返回值保持 DOM 与测量结果导向
- 设计器优先充当容错打开器；未知物料、缺失编辑器、资源失效等问题在画布上以明显占位块直接可见
- 近两版仅稳定最小消费面；`@easyink/renderer` 必须可脱离 `@easyink/designer` 单独使用
- 构建产物以 ESM 为主，额外提供 CDN 用 IIFE 兼容包，且以 renderer 为更高优先级
- `render()` 为 async 方法，等待所有资源（字体、图片）加载后返回；单个资源加载失败不阻断，通过诊断回调通知
- 渲染器根据 `page.unit` 直出对应 CSS 物理单位（mm -> `mm`、pt -> `pt`、inch -> `in`），并自动注入 `@page { size }` 打印样式，单位同样跟随 `page.unit`
- 设计器使用 Shadow DOM 做样式隔离；渲染器使用局部 `<style>` + 哈希前缀 + 内联样式
- 两阶段渲染：先在隐藏 DOM 容器中测量 auto-height 物料，再一次性渲染最终 DOM
- renderer/designer 直接依赖所有内置物料包，消费者无需手动注册
- 物料包作为独立 npm 内部包组织代码，保留三层子路径导出，但不推荐消费者直接使用
- 设计器画布不做推移布局，纯坐标定位，也不做溢出诊断；运行时推移是运行时语义
- 数据源字段树注册移入 designer 层，core 不再包含 DataSourceManager
- 物料类型定义新增 `causesPush`（是否触发推移）和 `canRotate`（是否可旋转）声明
- MaterialNode.id 使用 nanoid 生成
- 跨模板复制粘贴时重新生成 ID，保留绑定路径
- 设计器对外暴露为 Vue 组件 `<EasyInkDesigner />`，支持 v-model:schema
- 工作台偏好持久化通过 PreferenceProvider 接口由消费者实现（异步 load/save）
- 富文本物料 props.content 存储纯 HTML 字符串，属性面板中以源码编辑方式编辑
- 富文本 sanitize 由业务方负责，框架不内置 sanitizer
- 对齐/分布操作修改声明坐标，推移是运行时叠加效果

## 快速导航

- **想了解项目定位?** -> [01-overview](./01-overview.md) + [02-core-scenarios](./02-core-scenarios.md)
- **想了解代码结构?** -> [03-monorepo-structure](./03-monorepo-structure.md) + [04-layered-architecture](./04-layered-architecture.md)
- **想了解数据与渲染边界?** -> [05-schema-dsl](./05-schema-dsl.md) + [06-render-pipeline](./06-render-pipeline.md) + [08-datasource](./08-datasource.md)
- **想了解布局模型?** -> [07-layout-engine](./07-layout-engine.md)
- **想了解设计器 UI?** -> [10-designer-interaction](./10-designer-interaction.md)
- **想了解物料拖拽与交互策略?** -> [11-element-system](./11-element-system.md) + [10-designer-interaction](./10-designer-interaction.md)
- **想了解输出职责边界?** -> [06-render-pipeline](./06-render-pipeline.md) + [15-pdf-pipeline](./15-pdf-pipeline.md)
- **想了解历史决策?** -> [22-design-decisions](./22-design-decisions.md)
