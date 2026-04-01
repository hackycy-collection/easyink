# 16. 输出链路边界

## 16.1 当前结论

EasyInk 当前不内建打印、PDF 生成和图片导出管线。架构层只承诺把模板稳定渲染为 DOM，后续输出链路由业务方或未来扩展层自行组合。

这个调整的原因是：

- 不同业务部署环境对打印和导出链路差异很大。
- 当前阶段更重要的是先把 DSL、布局和设计器语义做稳定。
- 过早把 PDF/image 做成核心公共 API，会放大维护面并稀释主线。

## 16.2 EasyInk 负责什么

- 提供 DOM 页面节点和测量结果。
- 告知是否超出纸张高度。
- 保证设计器静态预览与运行时 DOM 渲染语义尽量一致。

## 16.3 EasyInk 不负责什么

- iframe 打印适配
- PDF 生成器封装
- 图片导出器封装
- 物理打印设备精度和缩放校准

## 16.4 业务侧推荐组合方式

```typescript
const result = renderer.render(schema, preparedDisplayData, container)

// 业务侧按自己的部署环境组合：
// 1. 浏览器打印：window.print / iframe / print-js
// 2. 服务端 PDF：Puppeteer / Playwright
// 3. 图片导出：html-to-image / dom-to-image
```

## 16.5 后续演进原则

如果未来重新引入输出适配层，也必须满足：

- 不反向污染 `@easyink/core` 的数据和布局模型
- 不要求模板层重新引入表达式或导出专用 DSL
- 输出适配器可以独立发布和独立演进
