# 贡献扩展

Contribution API 允许宿主应用向设计器注入自定义面板、工具栏按钮和命令，无需修改设计器源码。

## 基本用法

```ts
import type { Contribution } from '@easyink/designer'

const myContribution: Contribution = {
  id: 'my-plugin',
  activate(ctx) {
    // 注册面板、工具栏、命令
    ctx.onDispose(() => {
      // 清理逻辑
    })
  },
}
```

```vue
<EasyInkDesigner
  v-model:schema="schema"
  :contributions="[myContribution]"
/>
```

## ContributionContext

`activate` 函数接收 `ContributionContext`，提供以下能力：

### registerPanel

注册自定义面板，通过 Teleport 挂载到设计器的覆盖层。

```ts
ctx.registerPanel({
  id: 'my-panel',
  component: MyPanelComponent,     // Vue 组件
  teleportTarget: '#ei-overlay-root', // 挂载目标（默认）
  props: { /* 传递给组件的 props */ },
})
```

### registerToolbarAction

注册工具栏按钮。

```ts
ctx.registerToolbarAction({
  id: 'my-action',
  icon: MyIconComponent,           // Vue 图标组件
  label: 'My Action',
  onClick: (ctx) => {
    // 点击时执行
    const store = ctx.store
    // ...
  },
})
```

### registerCommand / executeCommand

注册和执行命令。命令可以接受参数并返回结果。

```ts
// 注册命令
ctx.registerCommand({
  id: 'export-schema',
  handler: (args, ctx) => {
    return JSON.stringify(ctx.store.schema)
  },
})

// 执行命令
const result = await ctx.executeCommand('export-schema')
```

命令可以跨 Contribution 共享。一个 Contribution 注册的命令可以被另一个 Contribution 执行。

### onDispose

注册清理回调，在 Contribution 卸载时执行。

```ts
ctx.onDispose(() => {
  // 移除事件监听、清理定时器等
})
```

### onDiagnostic

订阅设计器的诊断事件。

```ts
const unsubscribe = ctx.onDiagnostic((entry) => {
  console.warn(`[${entry.severity}] ${entry.message}`)
})

ctx.onDispose(unsubscribe)
```

### store

直接访问 `DesignerStore` 实例，可用于读取 Schema、操作元素等。

```ts
ctx.store.addElement(myNode)
ctx.store.updateElement(id, { width: 200 })
```

## 实际案例：AI 集成

EasyInk 的 AI 功能通过 Contribution 实现，可作为参考：

```ts
import { createAIContribution } from '@easyink/ai'

const contributions = [createAIContribution()]
```

`createAIContribution()` 内部注册了 AI 面板和工具栏按钮，对 Designer 零侵入。

## 典型扩展场景

| 场景 | 实现方式 |
|------|----------|
| 自定义属性面板 | `registerPanel` + 自定义 Vue 组件 |
| 工具栏快捷操作 | `registerToolbarAction` |
| 模板导入导出 | `registerCommand` + `executeCommand` |
| 外部系统集成 | `registerPanel` + `store` 读写 |
| 审计日志 | `onDiagnostic` 订阅 |
