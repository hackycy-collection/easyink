# 打印方案

EasyInk 提供两种本地打印方案，均为**静默打印**（无需用户手动操作浏览器打印对话框）。根据你的技术栈和部署环境选择合适的方案。

前端集成时优先使用官方打印包：

- `@easyink/print-easyink`：EasyInk Printer (.NET) 客户端和 Viewer 驱动
- `@easyink/print-hiprint`：HiPrint 客户端和 Viewer 驱动

业务侧只需要创建客户端、注册驱动并调用 `viewer.print()`，不需要自己实现 WebSocket、PDF 分块上传或 PrintDriver。

## 方案对比

| | EasyInk Printer (.NET) | HiPrint (vue-plugin-hiprint) |
|---|---|---|
| **技术栈** | .NET Framework 4.8 | Node.js / Electron |
| **运行平台** | 仅 Windows | Windows / macOS / Linux |
| **打印引擎** | Pdfium 渲染 + Windows Print Spooler | Chromium 内置打印 |
| **打印格式** | PDF（前端先渲染为 PDF 再发送） | HTML（直接发送页面 HTML） |
| **通信协议** | HTTP + WebSocket | WebSocket |
| **内置组件** | 项目内置 EasyInk Printer | 需额外安装 electron-hiprint |
| **适用场景** | Windows 桌面环境、需要矢量质量 | 跨平台、小票/标签打印 |
| **前端包** | `@easyink/print-easyink` | `@easyink/print-hiprint` |

## 如何选择

- **Windows 环境 + 需要稳定打印质量**：选 EasyInk Printer，Pdfium 渲染 + Windows 原生打印管线，DEVMODE 由驱动完整协商
- **跨平台**：选 HiPrint，electron-hiprint 支持 Windows/macOS/Linux
- **已有 electron-hiprint 服务**：直接复用，无需额外部署

## 下一步

- [EasyInk Printer (.NET)](/dotnet/) -- 内置打印服务，Windows 专用
- [Electron HiPrint](/hiprint/) -- 基于 vue-plugin-hiprint 的跨平台方案
