# EasyInk.Printer

## 概述

EasyInk.Printer 是 EasyInk 打印服务的完整应用，以 Windows 桌面应用形式运行，提供以下能力：

- **HTTP/WebSocket 服务**：供浏览器前端（Vue）调用打印功能
- **系统托盘**：后台静默运行，不占用任务栏
- **桌面管理窗口**：查看打印机状态、打印队列、审计日志、服务配置

### 设计目标

- 浏览器通过 HTTP/WebSocket 调用本地打印能力，无需 Electron
- 兼容 Windows 7 SP1 及以上（.NET Framework 4.8）
- PDF 矢量直通打印，无光栅化质量损失
- 零配置启动，开箱即用

## 架构原理

### 项目关系

```
EasyInk.Printer (WinExe, 完整应用)
├── 引用 EasyInk.Engine (DLL, 打印引擎)
├── 审计日志 (SQLite + Dapper)
├── HTTP/WebSocket 服务
└── WinForms UI

EasyInk.Engine (Library, 纯打印)
├── 打印机枚举/状态查询 (WMI)
├── PDF 打印执行 (SumatraPDF)
├── 打印队列管理
└── 日志通过事件回传调用方
```

```
┌──────────────────────────────────────────────────────────┐
│                    浏览器 (Vue 前端)                       │
│                     │  HTTP / WebSocket                    │
├─────────────────────┼────────────────────────────────────┤
│              EasyInk.Printer                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐               │
│  │ HttpServer│  │ WebSocket│  │ WinForms  │               │
│  │ (路由+API)│  │ (实时推送)│  │ (托盘+窗口)│              │
│  └─────┬────┘  └─────┬────┘  └───────────┘               │
│        └──────┬──────┘                                    │
│         ┌─────▼─────┐  ┌─────────────┐                    │
│         │ EngineApi  │  │ AuditService│                    │
│         │ (Engine)   │  │ (SQLite)    │                    │
│         └─────┬─────┘  └─────────────┘                    │
│        ┌──────┼──────┐                                    │
│  ┌─────▼──┐┌──▼───┐                                      │
│  │Printer ││Sumatra│                                      │
│  │Service ││Print  │                                      │
│  │(WMI)   ││Service│                                      │
│  └────────┘└──┬───┘                                       │
│               │  矢量直通                                   │
│         ┌─────▼─────┐                                     │
│         │SumatraPDF │                                     │
│         │  .exe     │                                     │
│         └───────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

### 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | .NET Framework 4.8 | Win7 SP1 兼容 |
| 打印引擎 | EasyInk.Engine | 轻量 DLL，仅 Newtonsoft.Json 依赖 |
| HTTP 服务 | HttpListener | 内置，零依赖 |
| WebSocket | HttpListener + WebSocketContext | .NET 4.8 原生支持 |
| UI | WinForms | 系统托盘 + 桌面窗口 |
| 审计存储 | SQLite + Dapper | 仅在 Printer 应用中 |

## 项目结构

```
EasyInk.Net/
├── EasyInk.Engine/              # 打印引擎 DLL
│   ├── src/
│   │   ├── EasyInk.Engine.csproj
│   │   ├── EngineApi.cs          # 公共 API，日志通过事件回传
│   │   ├── Models/               # 数据模型
│   │   └── Services/             # 打印机/打印/队列服务
│   └── tests/
├── EasyInk.Printer/             # 完整应用
│   ├── src/
│   │   ├── EasyInk.Printer.csproj
│   │   ├── Program.cs            # 入口，单实例检查
│   │   ├── Server/               # HTTP/WebSocket 服务
│   │   ├── Api/                  # API 控制器
│   │   ├── UI/                   # WinForms 界面
│   │   ├── Config/               # 配置管理
│   │   ├── Services/             # 审计日志服务
│   │   └── Utils/                # 工具类
│   └── tests/
```

## HTTP API 设计

### 基础约定

- 基地址：`http://localhost:{port}/api/`
- 响应格式与 Engine 的 `PrinterResult` 一致：

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

| 方法 | 路径 | 说明 | 对应 Engine 命令 |
|------|------|------|--------------|
| GET | `/api/printers` | 获取打印机列表 | `getPrinters` |
| GET | `/api/printers/{name}/status` | 获取打印机状态 | `getPrinterStatus` |

#### 打印

| 方法 | 路径 | 说明 | 对应 Engine 命令 |
|------|------|------|--------------|
| POST | `/api/print` | 同步打印 | `print` |
| POST | `/api/print/async` | 异步打印 | `printAsync` |
| POST | `/api/print/batch` | 批量同步打印 | `batchPrint` |
| POST | `/api/print/batch/async` | 批量异步打印 | `batchPrintAsync` |

#### 任务

| 方法 | 路径 | 说明 | 对应 Engine 命令 |
|------|------|------|--------------|
| GET | `/api/jobs` | 获取所有任务 | - |
| GET | `/api/jobs/{id}` | 获取任务状态 | `getJobStatus` |

#### 日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs` | 查询审计日志（Printer 自行实现） |

#### 服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 服务运行状态 |

### PDF 数据源支持

打印接口支持三种 PDF 输入方式：

| 格式 | HTTP 传输方式 | 说明 |
|------|--------------|------|
| `pdfBase64` | JSON body | Base64 编码的 PDF 字符串 |
| `pdfUrl` | JSON body | 远程 PDF URL 地址 |
| `pdfBytes` | multipart/form-data | 二进制 PDF 数据 |

### WebSocket

- 地址：`ws://localhost:{port}/ws`
- 支持双向通信：命令请求 + 状态推送

#### 文本帧（JSON 命令）

```json
{
  "command": "print",
  "id": "uuid",
  "params": {
    "printerName": "HP LaserJet",
    "pdfBase64": "JVBERi0xLjQK...",
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

## 配置模型

```json
{
  "httpPort": 18080,
  "autoStart": false,
  "minimizeToTray": true,
  "dbPath": null,
  "corsOrigins": ["http://localhost:*"]
}
```

配置文件路径：`%APPDATA%/EasyInk.Printer/config.json`

## 构建与部署

### 构建前准备

首次构建前需下载 SumatraPDF（PDF 直接打印引擎，约 15MB）：

```bash
cd lib/EasyInk.Net/EasyInk.Printer
powershell -File tools/download-sumatra.ps1
```

### 构建

```bash
cd lib/EasyInk.Net
dotnet build EasyInk.Printer/src
```

### 本地打包

本地打包脚本位于 `EasyInk.Printer/` 根目录：

- `build-portable.bat`：生成便携包 zip
- `build-installer.bat`：生成 Inno Setup 安装包 exe

默认情况下，脚本使用 `EasyInk.Printer.csproj` 和 `EasyInk.Engine.csproj` 中的默认版本。传入第一个参数时，会把同一个版本注入到：

- `Version`
- `AssemblyVersion`
- `FileVersion`
- `InformationalVersion`
- installer 的 `AppVersion`

示例：

```bat
cd lib\EasyInk.Net\EasyInk.Printer

build-portable.bat 1.2.3
build-installer.bat 1.2.3-beta.1
```

版本规则：

- 传入 `1.2.3` 时，程序集和文件版本为 `1.2.3.0`。
- 传入 `1.2.3-beta.1` 时，展示版本保留完整值，程序集和文件版本会归一到 `1.2.3.0`。

打包输出位置：

- `output/EasyInkPrinter-Portable.zip`
- `output/EasyInkPrinter-Setup.exe`

注意：应用界面和 `/api/status` 显示的版本优先读取 `InformationalVersion`，因此本地手动打包时传入的版本字符串会直接显示给用户。

### 发布产物

```
publish/
├── EasyInk.Printer.exe          # 主程序
├── EasyInk.Engine.dll           # 打印引擎
├── SumatraPDF.exe               # PDF 打印引擎（矢量直通）
├── Newtonsoft.Json.dll
├── Dapper.dll
├── System.Data.SQLite.dll
├── x64/
│   └── SQLite.Interop.dll
├── x86/
│   └── SQLite.Interop.dll
└── ...
```

### 部署要求

- Windows 7 SP1 及以上
- .NET Framework 4.8 运行时
- 安装目录需保留 `x64/SQLite.Interop.dll` 与 `x86/SQLite.Interop.dll`，否则审计日志模块会在启动时失败
- 无需额外安装，复制即用
