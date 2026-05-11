# EasyInk.Net

EasyInk 的 .NET 包集合，基于 .NET Framework 4.8 开发，兼容 Windows 7 SP1 及以上系统。

## 包列表

| 包名 | 说明 | 类型 |
|------|------|------|
| [EasyInk.Engine](EasyInk.Engine/) | 打印引擎（纯打印链路，无持久化） | DLL |
| [EasyInk.Printer](EasyInk.Printer/) | 打印服务应用（HTTP/WebSocket + 审计日志 + WinForms UI） | WinExe |

## 架构

```
浏览器 (Vue)
    │  HTTP / WebSocket
    ▼
EasyInk.Printer              ← 完整应用：HTTP 服务 + 系统托盘 + 桌面管理窗口 + 审计日志
    │
    ▼
EasyInk.Engine.dll           ← 打印引擎：打印机管理、PDF 打印执行、队列管理
    │
    ▼
SumatraPDF.exe               ← 矢量直通打印
```

## 目录结构

```
EasyInk.Net/
├── EasyInk.Engine/              # 打印引擎（类库 → DLL）
│   ├── src/
│   └── tests/
├── EasyInk.Printer/             # 打印服务应用（WinForms → EXE）
│   ├── src/
│   │   ├── Server/              # HTTP/WebSocket 服务
│   │   ├── Api/                 # API 控制器
│   │   ├── UI/                  # 系统托盘 + 桌面窗口
│   │   ├── Config/              # 配置管理
│   │   └── Services/            # 审计日志服务
│   └── tests/
└── README.md
```

## 环境要求

- .NET Framework 4.8 SDK（或 .NET SDK 10.0+，通过 `dotnet build` 构建 net48 项目）
- Visual Studio 2019 或更高版本（可选）

## 开发教程

### 1. 安装 .NET SDK

从 [.NET 官网](https://dotnet.microsoft.com/download) 下载并安装 .NET SDK。

### 2. 构建

```bash
cd lib/EasyInk.Net

# 构建打印引擎
dotnet build EasyInk.Engine/src

# 构建打印服务应用
dotnet build EasyInk.Printer/src

# 运行测试
dotnet test EasyInk.Engine/tests
dotnet test EasyInk.Printer/tests
```

### 3. 常用命令

| 命令 | 说明 |
|------|------|
| `dotnet build EasyInk.Engine/src` | 构建打印引擎 |
| `dotnet build EasyInk.Printer/src` | 构建打印服务应用 |
| `dotnet test EasyInk.Engine/tests` | 运行引擎测试 |
| `dotnet test EasyInk.Printer/tests` | 运行应用测试 |
| `dotnet publish EasyInk.Printer/src -c Release` | 发布应用 |

## 构建与打包要点

### 版本策略

- `EasyInk.Printer` 和 `EasyInk.Engine` 使用同一套构建版本参数。
- `Version` 用于产品语义版本，例如 `1.2.3` 或 `1.2.3-beta.1`。
- `AssemblyVersion` 和 `FileVersion` 统一使用四段数字版本，例如 `1.2.3.0`。
- `InformationalVersion` 用于展示和追踪构建，可携带预发布标签或提交信息。
- Printer UI 和 `/api/status` 返回的显示版本优先读取 `InformationalVersion`，无值时回退到 `AssemblyVersion`。

### GitHub Action 产物

`.github/workflows/build-easyink-dotnet.yml` 为手动触发 workflow，会在 Windows runner 上生成以下产物：

- `easyink-printer-portable-*`：便携包 zip，包含 `EasyInk.Printer.exe`、`EasyInk.Engine.dll` 和运行依赖。
- `easyink-printer-installer-*`：Inno Setup 安装包 exe。
- `easyink-engine-sdk-*`：独立的 Engine SDK zip，供外部宿主直接引用 `EasyInk.Engine.dll`。

### 本地手动打包

打包脚本位于 `EasyInk.Printer/`，不传参数时使用项目默认版本，传入参数时会同时注入 Printer、Engine 和 installer 的版本信息。

```bat
cd lib\EasyInk.Net\EasyInk.Printer

build-portable.bat 1.2.3
build-installer.bat 1.2.3-beta.1
```

版本参数规则：

- `1.2.3` 会生成 `AssemblyVersion=1.2.3.0`、`FileVersion=1.2.3.0`。
- `1.2.3-beta.1` 会生成 `Version=1.2.3-beta.1`、`InformationalVersion=1.2.3-beta.1`，同时将 `AssemblyVersion` 和 `FileVersion` 归一到 `1.2.3.0`。

首次打包前仍需先下载 SumatraPDF：

```powershell
cd lib/EasyInk.Net/EasyInk.Printer
powershell -File tools/download-sumatra.ps1
```

## 兼容性

| 系统 | 支持情况 |
|------|---------|
| Windows 7 SP1 | 支持（需安装 .NET Framework 4.8 运行时） |
| Windows 8/8.1 | 支持 |
| Windows 10 | 支持 |
| Windows 11 | 支持 |

## 部署

目标机器需要安装 .NET Framework 4.8 运行时：
- Windows 10 1903+ 已内置
- Windows 7/8/8.1 需要单独安装

下载地址：https://dotnet.microsoft.com/download/dotnet-framework/net48

## License

MIT
