# EasyInk.Net

EasyInk 的 .NET 包集合，基于 .NET Framework 4.8 开发，兼容 Windows 7 SP1 及以上系统。

## 包列表

| 包名 | 说明 | 状态 |
|------|------|------|
| [EasyInk.Printer](EasyInk.Printer/) | 打印插件（DLL） | 开发中 |
| [EasyInk.Printer.Host](EasyInk.Printer.Host/) | 打印服务宿主程序 | 开发中 |

## 架构

```
浏览器 (Vue)
    │  HTTP / WebSocket
    ▼
EasyInk.Printer.Host         ← 宿主程序：HTTP 服务 + 系统托盘 + 桌面管理窗口
    │
    ▼
EasyInk.Printer.dll          ← 打印插件：打印机管理、PDF 渲染、打印执行、审计日志
    │
    ▼
Windows API                  ← PrintDocument / WMI / PDFium / SQLite
```

## 目录结构

```
EasyInk.Net/
├── EasyInk.Printer/              # 打印插件（类库 → DLL）
│   ├── src/
│   ├── tests/
│   └── docs/
├── EasyInk.Printer.Host/         # 宿主程序（WinForms → EXE）
│   ├── src/
│   │   ├── Server/               # HTTP/WebSocket 服务
│   │   ├── Api/                  # API 控制器
│   │   ├── UI/                   # 系统托盘 + 桌面窗口
│   │   ├── Config/               # 配置管理
│   │   └── Plugin/               # DLL 插件包装
│   └── docs/
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

# 构建打印插件
dotnet build EasyInk.Printer/src

# 构建宿主程序
dotnet build EasyInk.Printer.Host/src

# 运行测试
dotnet run --project EasyInk.Printer/tests
```

### 3. 常用命令

| 命令 | 说明 |
|------|------|
| `dotnet build EasyInk.Printer/src` | 构建打印插件 |
| `dotnet build EasyInk.Printer.Host/src` | 构建宿主程序 |
| `dotnet run --project EasyInk.Printer/tests` | 运行插件测试 |
| `dotnet publish EasyInk.Printer.Host/src -c Release` | 发布宿主程序 |

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
