# ViewerHost 模式

ViewerHost 决定 Viewer 在哪里渲染。`@easyink/viewer` 提供三种 Host 模式，适用于不同场景。

## ViewerHost 接口

```ts
interface ViewerHost {
  readonly kind: 'browser' | 'iframe' | 'custom'
  readonly document: Document
  readonly window?: Window
  readonly mount: HTMLElement
  clear: () => void
  appendStyle: (css: string) => () => void
  print: () => void
}
```

## Browser Host

直接渲染到当前页面的 DOM 容器中。最简单，但样式可能与宿主页面互相影响。

```ts
import { createBrowserViewerHost, createViewer } from '@easyink/viewer'

const container = document.getElementById('viewer-root')
const host = createBrowserViewerHost(container)
const viewer = createViewer({ host })
```

等价快捷写法：

```ts
const viewer = createViewer({
  container: document.getElementById('viewer-root'),
})
```

**适用场景**：嵌入到已有页面中，不需要样式隔离。

## Iframe Host

渲染到 iframe 内部，实现样式和脚本完全隔离。**推荐方式**。

```ts
import { createIframeViewerHost, createViewer } from '@easyink/viewer'

const iframe = document.getElementById('viewer-iframe')
const host = createIframeViewerHost(iframe)
const viewer = createViewer({ host })
```

等价快捷写法：

```ts
const viewer = createViewer({
  iframe: document.getElementById('viewer-iframe'),
})
```

**工作原理**：
1. 读取 `iframe.contentDocument`
2. 确保 `<body>` 存在
3. 在 iframe body 内创建或查找 `<div id="easyink-viewer-root">` 作为 mount 点

**适用场景**：需要完全隔离渲染环境，防止样式污染和脚本冲突。

## Custom Host

完全自定义 document、window、mount 点和打印行为。

```ts
import { createCustomViewerHost, createViewer } from '@easyink/viewer'

const host = createCustomViewerHost({
  document: myDocument,
  window: myWindow,
  mount: myRootElement,
  print: () => {
    // 自定义打印逻辑
    window.print()
  },
})
const viewer = createViewer({ host })
```

**适用场景**：
- 在 Shadow DOM 中渲染
- 需要自定义打印行为（如发送到远程打印机）
- 在 Web Worker 或其他非标准环境中渲染

## 自定义 iframe 样式

使用 Iframe Host 时，可以在创建 Host 后自定义 iframe 内部样式：

```ts
const host = createIframeViewerHost(iframe)

// 自定义背景和布局
host.document.body.style.background = '#525659'
host.document.body.style.margin = '0'
host.mount.style.padding = '32px 48px'
host.mount.style.overflow = 'auto'

// 注入自定义 CSS
const removeStyle = host.appendStyle(`
  .ei-viewer-page {
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
`)

// 移除注入的样式
removeStyle()
```

## Host 生命周期

- `clear()` -- 清空 mount 点的所有子元素
- `appendStyle(css)` -- 注入 CSS 到 document.head，返回移除函数
- `print()` -- 调用 `window.print()`（Browser/Iframe）或自定义打印（Custom）
- `destroy()` -- 通过 `viewer.destroy()` 调用，清理所有状态
