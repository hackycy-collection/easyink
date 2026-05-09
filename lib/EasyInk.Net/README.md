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
