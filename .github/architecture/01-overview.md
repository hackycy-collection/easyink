# 1. 项目概览

EasyInk 是一个面向开发者的打印模板设计器库，提供可视化设计器和 Schema 驱动的渲染引擎。其设计目标是让业务系统能够快速集成打印模板的设计、数据填充和多格式输出能力。

## 设计原则

- **Schema 驱动**: 所有模板以 JSON Schema 描述，是唯一的真相来源（Single Source of Truth）
- **分层解耦**: headless 核心层与 UI 层分离，核心可独立使用
- **插件优先**: 全生命周期插件体系，从元素类型到渲染管线均可扩展
- **类型安全**: 全量 TypeScript，完整的类型导出，为插件开发者提供一流的 DX

## 技术栈

| 层面     | 选型                           |
| -------- | ------------------------------ |
| 框架     | Vue 3（Composition API）       |
| 语言     | TypeScript（strict mode）      |
| 构建     | tsdown + rollup-plugin-vue     |
| 包管理   | pnpm workspace（monorepo）     |
| 状态管理 | Vue Reactivity（@vue/reactivity） |
| 测试     | Vitest（单元）+ Playwright（E2E）|
| 样式     | CSS Variables + Scoped CSS     |
| 代码规范 | ESLint（@antfu/eslint-config） |
