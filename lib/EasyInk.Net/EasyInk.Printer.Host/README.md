# EasyInk.Printer.Host

## 概述

EasyInk.Printer.Host 是 EasyInk.Printer DLL 插件的宿主程序，以 Windows 桌面应用形式运行，提供以下能力：

- **HTTP/WebSocket 服务**：供浏览器前端（Vue）调用打印功能
- **系统托盘**：后台静默运行，不占用任务栏
- **桌面管理窗口**：查看打印机状态、打印队列、审计日志、服务配置

### 设计目标

- 浏览器通过 HTTP/WebSocket 调用本地打印能力，无需 Electron
- 兼容 Windows 7 SP1（.NET Framework 4.8）
- 零配置启动，开箱即用

## 架构原理

### 与 DLL 插件的关系

```
┌──────────────────────────────────────────────────────────┐
│                    浏览器 (Vue 前端)                       │
│                     │  HTTP / WebSocket                    │
├─────────────────────┼────────────────────────────────────┤
│              EasyInk.Printer.Host                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐               │
│  │ HttpServer│  │ WebSocket│  │ WinForms  │               │
│  │ (路由+API)│  │ (实时推送)│  │ (托盘+窗口)│              │
│  └─────┬────┘  └─────┬────┘  └───────────┘               │
│        └──────┬──────┘                                    │
│         ┌─────▼─────┐                                     │
│         │ PrinterApi │ ← DLL 插件入口                      │
│         └─────┬─────┘                                     │
│        ┌──────┼──────┐                                    │
│  ┌─────▼──┐┌──▼───┐┌─▼──────┐                            │
│  │Printer ││Print ││Audit   │                            │
│  │Service ││Service││Service │                            │
│  └────────┘└──────┘└────────┘                             │
└──────────────────────────────────────────────────────────┘
```

### 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | .NET Framework 4.8 | Win7 SP1 兼容 |
| HTTP 服务 | HttpListener | 内置，零依赖 |
| WebSocket | HttpListener + WebSocketContext | .NET 4.8 原生支持 |
| UI | WinForms | 系统托盘 + 桌面窗口 |
| JSON | Newtonsoft.Json | 与 DLL 插件一致 |
| 日志 | NLog 或 log4net | 文件日志 |

## 项目结构

```
EasyInk.Printer.Host/
├── src/
│   ├── EasyInk.Printer.Host.csproj
│   ├── Program.cs                    # 入口，单实例检查
│   ├── Server/
│   │   ├── HttpServer.cs             # HttpListener 封装
│   │   ├── Router.cs                 # HTTP 路由分发
│   │   ├── WebSocketHandler.cs       # WebSocket 连接管理
│   │   ├── WebSocketMessage.cs       # WebSocket 消息解析
│   │   ├── WebSocketCommandHandler.cs # WebSocket 命令处理
│   │   └── MultipartParser.cs        # multipart/form-data 解析
│   ├── Api/
│   │   ├── PrinterController.cs      # 打印机相关 API
│   │   ├── PrintController.cs        # 打印操作 API
│   │   ├── JobController.cs          # 任务队列 API
│   │   └── LogController.cs          # 审计日志 API
│   ├── UI/
│   │   ├── TrayIcon.cs              # 系统托盘管理
│   │   ├── MainWindow.cs            # 主管理窗口
│   │   ├── DashboardControl.cs      # 仪表盘 Tab
│   │   ├── PrintersControl.cs       # 打印机管理 Tab
│   │   ├── JobsControl.cs           # 打印任务 Tab
│   │   ├── LogsControl.cs           # 审计日志 Tab
│   │   └── SettingsControl.cs       # 设置 Tab
│   ├── Config/
│   │   └── HostConfig.cs            # 配置模型与持久化
│   └── Plugin/
│       └── PluginBridge.cs          # DLL 插件包装层
└── tests/
```

## HTTP API 设计

### 基础约定

- 基地址：`http://localhost:{port}/api/`
- 响应格式与 DLL 插件的 `PrinterResult` 一致：

```json
{
  "id": "请求ID",
  "success": true,
  "data": {},
  "errorInfo": null
}
```

### 接口列表

#### 打印机

| 方法 | 路径 | 说明 | 对应 DLL 命令 |
|------|------|------|--------------|
| GET | `/api/printers` | 获取打印机列表 | `getPrinters` |
| GET | `/api/printers/{name}/status` | 获取打印机状态 | `getPrinterStatus` |

#### 打印

| 方法 | 路径 | 说明 | 对应 DLL 命令 |
|------|------|------|--------------|
| POST | `/api/print` | 同步打印 | `print` |
| POST | `/api/print/async` | 异步打印 | `printAsync` |
| POST | `/api/print/batch` | 批量同步打印 | `batchPrint` |
| POST | `/api/print/batch/async` | 批量异步打印 | `batchPrintAsync` |

#### 任务

| 方法 | 路径 | 说明 | 对应 DLL 命令 |
|------|------|------|--------------|
| GET | `/api/jobs` | 获取所有任务 | - |
| GET | `/api/jobs/{id}` | 获取任务状态 | `getJobStatus` |

#### 日志

| 方法 | 路径 | 说明 | 对应 DLL 命令 |
|------|------|------|--------------|
| GET | `/api/logs` | 查询审计日志 | `queryLogs` |

#### 服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 服务运行状态 |
| GET | `/api/config` | 获取配置 |
| PUT | `/api/config` | 更新配置 |

### PDF 数据源支持

打印接口支持三种 PDF 输入方式：

| 格式 | HTTP 传输方式 | 说明 |
|------|--------------|------|
| `pdfBase64` | JSON body | Base64 编码的 PDF 字符串 |
| `pdfUrl` | JSON body | 远程 PDF URL 地址 |
| `pdfBytes` | multipart/form-data | 二进制 PDF 数据 |

#### JSON 方式（pdfBase64 / pdfUrl）

```
POST /api/print
Content-Type: application/json

{
  "printerName": "HP LaserJet",
  "pdfBase64": "JVBERi0xLjQK..." 或 "pdfUrl": "https://example.com/invoice.pdf",
  "copies": 1
}
```

#### Multipart 方式（pdfBytes）

```
POST /api/print
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="params"
Content-Type: application/json

{"printerName": "HP LaserJet", "copies": 1}
------FormBoundary
Content-Disposition: form-data; name="pdf"; filename="invoice.pdf"
Content-Type: application/pdf

<binary PDF data>
------FormBoundary--
```

### WebSocket

- 地址：`ws://localhost:{port}/ws`
- 支持双向通信：命令请求 + 状态推送

#### 文本帧（JSON 命令）

发送命令：
```json
{
  "command": "print",
  "id": "uuid",
  "params": {
    "printerName": "HP LaserJet",
    "pdfBase64": "JVBERi0xLjQK...",
    // 或
    // "pdfUrl": "https://example.com/invoice.pdf",
    "copies": 1
  }
}
```

#### 二进制帧（blob PDF）

```
┌────────────────┬─────────────────┬─────────────────┐
│ 4 字节 (uint32) │ N 字节 (JSON)    │ 剩余 (PDF 二进制) │
│ 元数据长度 N     │ 元数据           │ PDF 数据         │
└────────────────┴─────────────────┴─────────────────┘
```

元数据 JSON：
```json
{
  "command": "print",
  "id": "uuid",
  "params": {
    "printerName": "HP LaserJet",
    "copies": 1
  }
}
```

#### 支持的命令

| 命令 | 说明 |
|------|------|
| `print` | 同步打印 |
| `printAsync` | 异步打印 |
| `getPrinters` | 获取打印机列表 |
| `getPrinterStatus` | 获取打印机状态 |
| `getJobStatus` | 获取任务状态 |
| `getAllJobs` | 获取所有任务 |
| `queryLogs` | 查询审计日志 |

#### 服务端推送

```json
{
  "event": "jobStatusChanged",
  "data": {
    "jobId": "xxx",
    "status": "completed",
    "printerName": "..."
  }
}
```

## UI 设计

### 系统托盘

```
┌─────────────────────────┐
│  EasyInk Printer        │
│  ─────────────────────  │
│  服务状态: 运行中         │
│  端口: 18080             │
│  ─────────────────────  │
│  显示主窗口              │
│  重启服务                │
│  ─────────────────────  │
│  退出                    │
└─────────────────────────┘
```

- 启动后最小化到系统托盘
- 双击托盘图标打开主窗口
- 右键菜单：显示窗口 / 重启服务 / 退出

### 主窗口（Tab 布局）

```
┌─────────────────────────────────────────────────┐
│  EasyInk Printer Host                    ─ □ ×  │
├─────┬───────────────────────────────────────────┤
│     │                                           │
│ 仪表 │  [仪表盘内容区域]                           │
│ 盘   │                                           │
│     │  服务状态: 运行中                            │
│ 打印 │  HTTP 端口: 18080                          │
│ 机   │  WebSocket 连接数: 3                       │
│     │  今日打印: 128 次                           │
│ 任务 │  队列中: 2                                 │
│     │                                           │
│ 日志 │                                           │
│     │                                           │
│ 设置 │                                           │
│     │                                           │
└─────┴───────────────────────────────────────────┘
```

#### Tab 1: 仪表盘
- 服务运行状态（端口、连接数）
- 今日打印统计
- 当前队列状态

#### Tab 2: 打印机管理
- 已安装打印机列表
- 每台打印机的实时状态（在线/离线/缺纸/卡纸）
- 支持的纸张尺寸

#### Tab 3: 打印任务
- 任务列表（排队中/打印中/已完成/失败）
- 任务详情查看
- 失败任务错误信息

#### Tab 4: 审计日志
- 日志列表，支持时间范围/打印机/用户筛选
- 导出功能

#### Tab 5: 设置
- HTTP 端口配置
- 开机自启动
- 日志级别
- 数据库路径

## 核心流程

### 浏览器打印流程

```
浏览器                Host                   DLL 插件
  │                    │                       │
  │  POST /api/print   │                       │
  │───────────────────>│                       │
  │                    │  PrinterApi.Print()    │
  │                    │──────────────────────>│
  │                    │                       │
  │                    │  检查打印机状态          │
  │                    │  渲染 PDF → Image       │
  │                    │  调用 PrintDocument     │
  │                    │  记录审计日志            │
  │                    │                       │
  │                    │  PrinterResult          │
  │                    │<──────────────────────│
  │   JSON Response    │                       │
  │<───────────────────│                       │
```

### WebSocket 实时推送流程

```
浏览器                Host                   DLL 插件
  │                    │                       │
  │  WS /ws            │                       │
  │═══════════════════>│  (保持连接)            │
  │                    │                       │
  │  subscribe:jobs    │                       │
  │───────────────────>│                       │
  │                    │                       │
  │  POST /api/print   │                       │
  │  (另一请求)         │                       │
  │───────────────────>│  PrintAsync()         │
  │                    │──────────────────────>│
  │                    │                       │
  │  jobStatusChanged  │  (任务完成时)           │
  │<═══════════════════│                       │
```

## 配置模型

```json
{
  "httpPort": 18080,
  "autoStart": false,
  "minimizeToTray": true,
  "logLevel": "Info",
  "dbPath": null,
  "corsOrigins": ["http://localhost:*"]
}
```

配置文件路径：`%APPDATA%/EasyInk.Printer.Host/config.json`

## 单实例保证

程序启动时通过 `Mutex` 检测是否已有实例运行，避免端口冲突。

## 构建与部署

### 构建

```bash
cd lib/EasyInk.Net
dotnet build EasyInk.Printer.Host/src
```

### 发布产物

```
publish/
├── EasyInk.Printer.Host.exe    # 主程序
├── EasyInk.Printer.dll         # DLL 插件
├── Newtonsoft.Json.dll
├── Dapper.dll
├── System.Data.SQLite.dll
├── NLog.dll
└── ...
```

### 部署要求

- Windows 7 SP1 及以上
- .NET Framework 4.8 运行时
- 无需额外安装，复制即用

## 后续扩展

- 打印模板管理
- 多机打印负载均衡
- 打印权限控制（Token 认证）
- 自动更新机制
