# 1. 项目概览

EasyInk 是一个面向开发者的打印模板设计器库，提供可视化设计器和 Schema 驱动的 DOM 渲染能力。当前架构的重点不是在运行时做复杂计算，而是把模板编辑、简单字段绑定和稳定 DOM 输出做好，把展示值装配、打印链路和导出链路交给业务方或后续框架扩展。

## 设计原则

- **Schema 驱动**: 所有模板以 JSON 结构描述，是唯一的真相来源。
- **DOM 优先**: 运行时以 DOM 输出为唯一核心承诺，设计器预览与最终渲染共享同一渲染语义。
- **数据前置装配**: 日期、金额、拼接文本、条件分支等派生逻辑均由业务方在渲染前完成，Schema 只保留字段选择。
- **运行时能力克制**: 不内建表达式引擎、不内建 PDF/打印/image 输出链路、不在模板层支持动态块展开。
- **分层解耦**: headless 核心层与 UI 层分离，设计器能力不污染运行时 DOM 渲染内核。
- **类型安全**: 全量 TypeScript，确保 Schema、物料定义和属性表单的静态约束清晰可维护。

## 当前职责边界

- EasyInk 负责：Schema 维护、设计器交互、字段绑定记录、布局计算、DOM 渲染。
- 业务方负责：展示值预装配、复杂数据变换、打印/PDF/image 链路、自定义物料的开放时机。
- 物理打印效果兜底不由架构层强约束，框架不对扫码率、打印机精度和设备缩放做内建承诺。

## 技术栈

| 层面     | 选型 |
| -------- | ---- |
| 框架     | Vue 3（Composition API） |
| 语言     | TypeScript（strict mode） |
| 构建     | tsdown + rollup-plugin-vue |
| 包管理   | pnpm workspace（monorepo） |
| 状态管理 | Vue Reactivity（@vue/reactivity） |
| 测试     | Vitest（单元）+ Playwright（E2E） |
| 样式     | CSS Variables + Scoped CSS |
| 代码规范 | ESLint（@antfu/eslint-config） |
