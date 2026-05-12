# .NET 打印服务

EasyInk 的 .NET 组件提供 **Windows 本地打印能力**，让浏览器端（Vue）无需 Electron 即可通过 HTTP/WebSocket 调用本地打印机。

这套组件是独立的 .NET 工程，与 `@easyink/*` 的 Node.js 包体系互不依赖。

## 架构总览

```
浏览器 (Vue 前端)
    │  HTTP / WebSocket
    ▼
EasyInk.Printer              ← 完整应用：HTTP 服务 + 系统托盘 + 桌面管理窗口 + 审计日志
    │
    ▼
EasyInk.Engine.dll           ← 打印引擎：打印机管理、PDF 打印执行、队列管理
    │
    ▼
SumatraPDF.exe               ← 矢量直通打印（无光栅化质量损失）
```

## 两个组件

| 组件 | 类型 | 说明 |
|------|------|------|
| **EasyInk.Engine** | DLL（类库） | 纯打印引擎，无 UI、无持久化。可嵌入任何 .NET 宿主 |
| **EasyInk.Printer** | WinExe（桌面应用） | 完整打印服务：HTTP/WebSocket 服务器 + 系统托盘 + 管理窗口 + 审计日志 |

## 集成方式

根据你的场景选择不同的集成方式：

| 场景 | 推荐方式 | 说明 |
|------|---------|------|
| 浏览器应用需要调用本地打印机 | 安装 **EasyInk.Printer** | 运行桌面应用，前端通过 HTTP/WebSocket 调用 |
| 自有 .NET 应用需要打印能力 | 引用 **EasyInk.Engine.dll** | 直接调用 `EngineApi`，无需 HTTP 层 |
| 需要嵌入到 Electron / 其他桌面壳 | 引用 **EasyInk.Engine.dll** | 通过进程内调用或自建 HTTP 层 |

## 环境要求

- **操作系统**：Windows 7 SP1 及以上
- **运行时**：.NET Framework 4.8（Windows 10 1903+ 已内置）
- **开发**：.NET SDK（`dotnet build`）或 Visual Studio 2019+

## 下一步

- [快速上手](./getting-started) -- 构建并运行第一个打印服务
- [Engine DLL](./engine) -- 在自有 .NET 应用中集成打印引擎
- [Printer 应用](./printer) -- 安装和配置独立打印服务
- [API 参考](./api-reference) -- HTTP / WebSocket 接口文档
