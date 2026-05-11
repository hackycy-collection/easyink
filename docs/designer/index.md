# Designer

`@easyink/designer` 是一个基于 Vue 3 的文档/报表设计器组件。通过 `<EasyInkDesigner>` 组件嵌入你的应用，提供完整的画布编辑、物料拖放、数据绑定、对齐吸附、撤销重做等能力。

## 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EasyInkDesigner, createLocalStoragePreferenceProvider } from '@easyink/designer'
import zhCN from '@easyink/designer/locale/zh-CN'
import '@easyink/designer/index.css'

const schema = ref({ /* DocumentSchema */ })
const preferenceProvider = createLocalStoragePreferenceProvider()
</script>

<template>
  <EasyInkDesigner
    v-model:schema="schema"
    :locale="zhCN"
    :preference-provider="preferenceProvider"
  />
</template>
```

## 组件 Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schema` | `DocumentSchema` | 是 | 文档模板，支持 `v-model:schema` 双向绑定 |
| `dataSources` | `DataSourceDescriptor[]` | 否 | 数据源描述符列表，定义可绑定的字段树 |
| `locale` | `LocaleMessages` | 否 | 国际化消息，如 `zhCN` |
| `preferenceProvider` | `PreferenceProvider` | 否 | 用户偏好持久化 provider |
| `autoSave` | `TemplateAutoSaveOptions` | 否 | 自动保存配置 |
| `contributions` | `Contribution[]` | 否 | 贡献扩展列表（如 AI 面板） |
| `setupStore` | `(store: DesignerStore) => void` | 否 | Store 初始化回调，用于注册自定义物料 |

## Slots

| Slot | 说明 |
|------|------|
| `#topbar` | 自定义顶栏内容，通过 Teleport 挂载到顶栏区域 |

## 自动保存

```ts
const autoSaveOptions = {
  enabled: true,
  delay: 1000,
  save: async (schemaSnapshot: DocumentSchema) => {
    // schemaSnapshot 是当前 Schema 的快照
    await saveToBackend(schemaSnapshot)
  },
}
```

自动保存的工作流程：
1. 用户编辑触发 Schema 变化
2. 经过 `delay` 毫秒防抖后调用 `save` 回调
3. 保存期间状态栏显示保存状态（保存中/已保存/保存失败）

## 偏好持久化

通过 `PreferenceProvider` 接口保存和恢复用户的面板布局、缩放等偏好设置。

```ts
// 使用 localStorage 持久化
const preferenceProvider = createLocalStoragePreferenceProvider()
```

也可以自定义持久化方式：

```ts
const preferenceProvider = {
  get: async (key: string) => {
    // 从你的存储读取
  },
  set: async (key: string, value: unknown) => {
    // 写入你的存储
  },
}
```

## 自定义物料

通过 `setupStore` 回调注册自定义物料。

```ts
import { registerMaterialBundle } from '@easyink/designer'

function onSetupStore(store: DesignerStore) {
  registerMaterialBundle(store, {
    materials: [{
      type: 'my-widget',
      name: 'My Widget',
      icon: 'widget',
      category: 'basic',
      capabilities: { resizable: true, bindable: true },
      createDefaultNode: (input) => ({
        id: generateId(),
        type: 'my-widget',
        x: 0, y: 0, width: 100, height: 50,
        ...input,
      }),
      factory: (ctx) => ({ /* DesignerExtension */ }),
    }],
    quickMaterialTypes: ['my-widget'],
    groupedCatalog: [{ type: 'my-widget', group: 'utility' }],
  })
}
```

## 贡献扩展

通过 `Contribution` API 向设计器注入自定义面板、工具栏按钮和命令，无需修改设计器源码。

```ts
import type { Contribution } from '@easyink/designer'

const myContribution: Contribution = {
  id: 'my-plugin',
  activate(ctx) {
    // 注册自定义面板
    ctx.registerPanel({
      id: 'my-panel',
      component: MyPanelComponent,
      teleportTarget: '#ei-overlay-root',
    })

    // 注册工具栏按钮
    ctx.registerToolbarAction({
      id: 'my-action',
      icon: MyIcon,
      label: 'My Action',
      onClick: () => { /* ... */ },
    })

    // 注册命令
    ctx.registerCommand({
      id: 'my-command',
      handler: (args, ctx) => { /* ... */ },
    })

    // 清理回调
    ctx.onDispose(() => { /* cleanup */ })
  },
}
```

```vue
<EasyInkDesigner
  v-model:schema="schema"
  :contributions="[myContribution]"
/>
```

## Store 访问

在组件外部通过 `useDesignerStore()` 获取 Store 实例。

```ts
import { useDesignerStore } from '@easyink/designer'

const store = useDesignerStore()

// 元素操作
store.addElement(node)
store.removeElement(id)
store.updateElement(id, { width: 200 })

// Schema 操作
store.setSchema(newSchema)

// 国际化
store.t('common.save')
```

## 国际化

内置中文语言包，也支持自定义。

```ts
import zhCN from '@easyink/designer/locale/zh-CN'

// 使用内置中文
<EasyInkDesigner :locale="zhCN" />

// 自定义语言包（结构参考 zhCN）
const myLocale = { /* ... */ }
<EasyInkDesigner :locale="myLocale" />
```

## CSS 引入

必须在入口文件中引入样式：

```ts
import '@easyink/designer/index.css'
```
