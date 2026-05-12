# EasyInk.Printer

EasyInk.Printer 是完整的 Windows 桌面打印服务应用，以内置 HTTP/WebSocket 服务器接收浏览器端的打印请求，无需 Electron。

## 功能一览

- **HTTP 服务**：RESTful API，供浏览器前端调用
- **WebSocket 服务**：实时双向通信，支持大文件分块上传
- **系统托盘**：后台静默运行，不占用任务栏
- **桌面管理窗口**：仪表盘、打印机列表、任务队列、审计日志、设置
- **审计日志**：SQLite 持久化，按打印机/状态/时间查询
- **安全**：API Key 认证（常量时间比较）、CORS 控制、SSRF 防护

## 架构

```
浏览器 (Vue)
    │  HTTP / WebSocket
    ▼
EasyInk.Printer
├── HttpServer         ← 路由 + API + CORS + 认证
├── WebSocketHandler   ← 实时通信 + 分块上传
├── EngineApi          ← 引用 EasyInk.Engine.dll
├── AuditService       ← SQLite + Dapper
└── WinForms UI        ← 系统托盘 + 管理窗口
```

## 安装

### 方式一：便携包

从 GitHub Actions 下载 `easyink-printer-portable-*` zip，解压后运行 `EasyInk.Printer.exe`。

### 方式二：安装包

从 GitHub Actions 下载 `easyink-printer-installer-*` exe，运行安装向导。

### 方式三：从源码构建

```bash
cd lib/EasyInk.Net

# 首次构建前下载 SumatraPDF
cd EasyInk.Printer
powershell -File tools/download-sumatra.ps1
cd ..

# 构建
dotnet build EasyInk.Printer/src
```

## 本地打包

```bat
cd lib\EasyInk.Net\EasyInk.Printer

# 便携包
build-portable.bat 1.2.3

# 安装包
build-installer.bat 1.2.3-beta.1
```

打包产物：

- `output/EasyInkPrinter-Portable.zip`
- `output/EasyInkPrinter-Setup.exe`

## 配置

配置文件路径：`%APPDATA%/EasyInk.Printer/config.json`（首次运行自动生成）

```json
{
  "httpPort": 18080,
  "autoStart": false,
  "minimizeToTray": true,
  "startMinimized": true,
  "dbPath": null,
  "sumatraTempDir": null,
  "crashLogDir": null,
  "trustAllOrigins": false,
  "apiKey": null,
  "maxWebSocketConnections": 100,
  "maxQueueSize": 100,
  "printTimeoutSeconds": 30,
  "maxConcurrentRequests": 50
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `httpPort` | HTTP/WebSocket 监听端口 | `18080` |
| `autoStart` | 开机自动启动（写入注册表） | `false` |
| `minimizeToTray` | 关闭窗口时最小化到托盘 | `true` |
| `startMinimized` | 启动时最小化 | `true` |
| `dbPath` | 审计数据库路径（null 为默认位置） | `null` |
| `sumatraTempDir` | SumatraPDF 临时目录 | `null` |
| `crashLogDir` | 崩溃日志目录 | `null` |
| `trustAllOrigins` | 允许所有 CORS 来源 | `false` |
| `apiKey` | API Key（null 为不启用认证） | `null` |
| `maxWebSocketConnections` | WebSocket 最大连接数 | `100` |
| `maxQueueSize` | 打印队列最大长度 | `100` |
| `printTimeoutSeconds` | 单次打印超时（秒） | `30` |
| `maxConcurrentRequests` | HTTP 最大并发请求数 | `50` |

## 安全

### API Key 认证

设置 `apiKey` 后，所有请求需携带 `X-API-Key` 头：

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:18080/api/printers
```

认证使用常量时间比较（XOR），防止时序攻击。

### CORS

默认只允许本地来源（`localhost`、`127.0.0.1`、`::1`）。设置 `trustAllOrigins: true` 可放行所有来源。

### 请求限制

| 类型 | 限制 |
|------|------|
| HTTP 请求体 | 10 MB |
| WebSocket 二进制消息 | 60 MB |
| PDF 文件大小 | 50 MB |
| WebSocket 分块大小 | 2 MB |

## 发布产物

```
publish/
├── EasyInk.Printer.exe          # 主程序
├── EasyInk.Engine.dll           # 打印引擎
├── SumatraPDF.exe               # PDF 打印引擎（矢量直通）
├── Newtonsoft.Json.dll
├── Dapper.dll
├── System.Data.SQLite.dll
└── ...
```

## 部署要求

- Windows 7 SP1 及以上
- .NET Framework 4.8 运行时（Windows 10 1903+ 已内置，Windows 7/8/8.1 需[单独安装](https://dotnet.microsoft.com/download/dotnet-framework/net48)）
- 无需额外安装，复制即用
