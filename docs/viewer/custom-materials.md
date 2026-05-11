# 自定义物料渲染器

Viewer 通过 `MaterialRendererRegistry` 管理物料的渲染逻辑。每个物料类型对应一个 `MaterialViewerExtension`，定义如何在预览态渲染该物料。

## 注册物料渲染器

```ts
import { createViewer } from '@easyink/viewer'

const viewer = createViewer({ host })

viewer.registerMaterial('my-widget', {
  render(node, context) {
    return {
      html: `<div class="my-widget">${escapeHtml(node.props.content)}</div>`,
    }
  },
  measure(node, context) {
    return { width: node.width, height: 100 }
  },
  pageAware: false,
})
```

## MaterialViewerExtension

```ts
interface MaterialViewerExtension {
  render: (node: MaterialNode, context: ViewerRenderContext) => ViewerRenderOutput
  measure?: (node: MaterialNode, context: ViewerMeasureContext) => ViewerMeasureResult
  getRenderSize?: (node: MaterialNode, context: ViewerRenderContext) => ViewerRenderSize
  pageAware?: boolean
}
```

### render

必须实现。返回渲染结果。

```ts
render(node, context) {
  const { props, binding } = node
  // 返回 DOM 元素
  return {
    element: myDomElement,
  }
  // 或返回受信 HTML
  return {
    html: trustedViewerHtml('<div>...</div>'),
  }
}
```

### measure

可选。用于动态尺寸物料（如表格数据扩展行高）。在分页规划前调用。

```ts
measure(node, context) {
  // 测量内容实际高度
  return { width: node.width, height: calculatedHeight }
}
```

### getRenderSize

可选。获取渲染尺寸，默认回退到 `node.width` / `node.height`。

### pageAware

可选。设为 `true` 表示该物料应跨页复制（如页码元素）。Viewer 会将该元素复制到每一页，并注入 `__pageNumber` 和 `__totalPages` 属性。

## 渲染上下文

```ts
interface ViewerRenderContext {
  data?: Record<string, unknown>      // 运行时数据
  dataSources?: DataSourceDescriptor[] // 数据源
  pageNumber?: number                  // 当前页码
  totalPages?: number                  // 总页数
}
```

## 未注册物料的处理

如果物料类型未注册渲染器，Viewer 会显示一个红色虚线边框的占位符，包含 `[Unknown: type]` 文本。不会静默吞掉错误。

## 与 Designer 物料配合

完整的自定义物料需要同时注册 Designer 和 Viewer 两套扩展：

1. **Designer 扩展**：通过 `registerMaterialBundle` 的 `factory` 注册（定义编辑态交互）
2. **Viewer 扩展**：通过 `viewer.registerMaterial` 注册（定义预览态渲染）

```ts
// Designer 侧
registerMaterialBundle(store, {
  materials: [{
    type: 'my-widget',
    factory: (ctx) => ({ /* DesignerExtension */ }),
    // ...
  }],
})

// Viewer 侧
viewer.registerMaterial('my-widget', {
  render: (node, context) => { /* ... */ },
})
```
