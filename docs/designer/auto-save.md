# 自动保存

Designer 内置自动保存机制，在 Schema 变化后经过防抖延迟自动调用你的保存回调。

## 配置

```ts
const autoSaveOptions = {
  enabled: true,           // 是否启用
  delay: 1000,             // 防抖延迟（毫秒），默认 1000
  save: async (schema) => {
    // schema 是当前 Schema 的深拷贝快照
    await saveToBackend(schema)
  },
}
```

```vue
<EasyInkDesigner
  v-model:schema="schema"
  :auto-save="autoSaveOptions"
/>
```

## 工作流程

1. 用户编辑触发 Schema 变化
2. 经过 `delay` 毫秒防抖后触发保存
3. `save` 回调接收 Schema 的深拷贝快照（`JSON.parse(JSON.stringify(...))`）
4. 保存期间状态栏显示保存状态
5. 保存成功后 1.4 秒重置状态指示
6. 保存失败时状态栏显示错误信息

## 并发保护

自动保存内置并发保护：

- 如果上一次保存仍在进行中，新的保存请求会排队
- 上一次保存完成后自动执行排队的保存
- 通过 generation 计数器丢弃过期的保存请求

## 动态启用/禁用

`autoSaveOptions` 可以是响应式的 computed：

```ts
const currentTemplate = ref<StoredTemplate | null>(null)

const autoSaveOptions = computed(() => ({
  enabled: Boolean(currentTemplate.value),
  delay: 1000,
  save: saveCurrentTemplate,
}))
```

当 `enabled` 变为 `false` 时，所有自动保存状态会被重置。

## 状态指示

状态栏会显示以下保存状态：

| 状态 | 含义 |
|------|------|
| 空闲 | 未启用自动保存或无变更 |
| 保存中 | 正在调用 save 回调 |
| 已保存 | 保存成功 |
| 保存失败 | save 回调抛出异常 |

## 与模板切换配合

切换模板时，应先加载新 Schema 再启用自动保存。`markSchemaLoaded()` 方法会抑制首次 Schema 变化触发的自动保存，避免加载模板时误触发保存。

```ts
// 内部实现：useTemplateAutoSave composable
// Designer 组件自动管理，无需手动调用
```
