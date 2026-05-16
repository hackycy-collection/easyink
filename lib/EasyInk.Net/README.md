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
EasyInk.Engine.dll           ← 打印引擎：Pdfium 渲染 + Windows Print Spooler
```

## 打印链路说明

EasyInk 当前保留两条 PDF 打印链路，默认使用内置链路，SumatraPDF 可作为按打印机启用的兼容 fallback。修改打印逻辑前先确认问题属于哪条链路，避免用软件层补丁覆盖驱动能力。

### 1. 默认链路：PDFium + PrintDocument + PrintableArea

```
PDF
  → PdfiumViewer 按目标输出尺寸渲染为位图
  → System.Drawing.Printing.PrintDocument
  → Windows Print Spooler
  → 打印机驱动
```

适用场景：

- 普通办公打印机、A4/A5 激光/喷墨、Windows 默认打印机驱动。
- 需要 Win7 SP1 兼容，且不希望额外带外部 PDF 打印程序。

关键约定：

- 默认 `ForcePaperSize=false`，由打印机驱动使用当前默认纸张。
- 打印区域优先使用驱动返回的 `PageSettings.PrintableArea`，内容等比缩放并居中到可打印区域内，效果接近浏览器的 fit 行为。
- 打印区域只使用驱动返回的 `PrintableArea`，不在软件层额外缩进或缩放设计内容。
- 默认渲染 DPI 为 600，并参考驱动分辨率，最高限制到 1200；对 360 DPI 及以下的小票/热敏类低分辨率设备，默认贴合驱动原生 DPI 渲染，避免 600 DPI 位图再被 GDI/驱动下采样导致文字变软。

已知边界：

- 该链路本质是 `PDF → bitmap → GDI print`，文字和矢量图不会像 Chrome/Edge 原生 PDF 打印那样完整保留矢量路径。
- 如果打印机驱动报告的默认纸张、可打印区域或分辨率不准，仍可能出现偏移、缩放异常或轻微模糊。

### 2. 可配置 fallback：SumatraPDF 命令行打印

```
PDF 临时文件
  → SumatraPDF.exe -print-to "PrinterName" -print-settings "fit"
  → Windows Print Spooler
  → 打印机驱动
```

推荐命令形态：

```bat
SumatraPDF.exe -silent -exit-on-print -print-to "PrinterName" -print-settings "fit" "file.pdf"
```

适用场景：

- 某些打印机在默认链路下仍然错位、裁切或模糊，但 Chrome/浏览器打印正常。
- 希望让外部 PDF 打印器处理纸张适配和可打印区域 fit。

关键约定：

- `fit` 表示把 PDF 页面缩放到驱动纸张的 printable area 内。
- SumatraPDF 依赖打印机驱动当前默认纸张和首选项；默认纸张不正确时，仍会按错误纸张适配。
- 通过 `SumatraPdfPath` 和 `SumatraPrinterNames` 按打印机启用，不要无条件替换默认链路。
- `SumatraPdfPath` 默认指向程序目录下的 `SumatraPDF\SumatraPDF.exe`，Printer 打包产物必须内置该文件。
- `SumatraPrintSettings` 默认 `fit`，可按需配置为 SumatraPDF 支持的打印参数组合。
- `SumatraTimeoutSeconds` 默认 60 秒。
- Win7 场景需要固定并随包分发一个实测可用的 SumatraPDF portable 版本，不要自动追最新版。

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

`build-portable.bat` 和 `build-installer.bat` 会在发布前自动准备内置 `src\SumatraPDF\SumatraPDF.exe`；也可以手动运行 `powershell -ExecutionPolicy Bypass -File tools\download-sumatra.ps1` 预先下载固定版本的 32-bit portable SumatraPDF。

版本参数规则：

- `1.2.3` 会生成 `AssemblyVersion=1.2.3.0`、`FileVersion=1.2.3.0`。
- `1.2.3-beta.1` 会生成 `Version=1.2.3-beta.1`、`InformationalVersion=1.2.3-beta.1`，同时将 `AssemblyVersion` 和 `FileVersion` 归一到 `1.2.3.0`。

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
