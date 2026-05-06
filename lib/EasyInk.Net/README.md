# EasyInk.Net

EasyInk 的 .NET 包集合，基于 .NET Framework 4.8 开发，兼容 Windows 7 SP1 及以上系统。

## 包列表

| 包名 | 说明 | 状态 |
|------|------|------|
| [EasyInk.Printer](EasyInk.Printer/) | 打印插件 | 开发中 |

## 目录结构

```
EasyInk.Net/
├── EasyInk.Printer/            # 打印插件
│   ├── src/                    # 源代码（类库 → DLL）
│   │   ├── EasyInk.Printer.csproj
│   │   ├── PrinterApi.cs
│   │   ├── Models/
│   │   └── Services/
│   ├── tests/                  # 测试项目（控制台 → EXE）
│   │   ├── EasyInk.Printer.Tests.csproj
│   │   └── Program.cs
│   └── docs/
│       └── architecture.md
└── README.md
```

## 环境要求

- .NET Framework 4.8 SDK（或 .NET SDK 10.0+，通过 `dotnet build` 构建 net48 项目）
- Visual Studio 2019 或更高版本（可选）

## 开发教程

### 1. 安装 .NET SDK

从 [.NET 官网](https://dotnet.microsoft.com/download) 下载并安装 .NET SDK。

### 2. 配置 PATH 环境变量

安装完成后，如果 PowerShell 中执行 `dotnet` 提示"无法识别"，需要手动将 `C:\Program Files\dotnet` 加入 PATH：

```powershell
# 当前用户永久生效（执行后重启 PowerShell）
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\dotnet", "User")

# 或临时生效（当前窗口有效，关闭后失效）
$env:Path += ";C:\Program Files\dotnet"
```

验证安装：

```bash
dotnet --version
dotnet --list-sdks
```

### 3. 构建项目

```bash
# 克隆仓库后进入 .NET 包目录
cd lib/EasyInk.Net

# 构建打印插件（输出 DLL 到 src/bin/ 目录）
dotnet build EasyInk.Printer/src

# 运行测试项目（编译并执行 tests/Program.cs）
dotnet run --project EasyInk.Printer/tests
```

### 4. 常用命令速查

| 命令 | 说明 |
|------|------|
| `dotnet build EasyInk.Printer/src` | 构建打印插件，生成 DLL |
| `dotnet build EasyInk.Printer/src -c Release` | Release 模式构建 |
| `dotnet build EasyInk.Printer/src --no-incremental` | 全量重新构建 |
| `dotnet run --project EasyInk.Printer/tests` | 运行测试 |
| `dotnet clean EasyInk.Printer/src` | 清理构建产物 |

### 5. 输出产物

构建产物位于 `EasyInk.Printer/src/bin/{Debug|Release}/net48/` 目录：

- `EasyInk.Printer.dll` — 主程序集，供 Electron 通过 edge-js 调用
- `EasyInk.Printer.xml` — API 文档注释

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

## Electron 集成

各包可通过 edge-js 或 node-ffi 调用，详见各包文档。

```javascript
const edge = require('edge-js')

const api = edge.func({
  assemblyFile: 'path/to/EasyInk.Printer.dll',
  typeName: 'EasyInk.Printer.PrinterApi',
  methodName: 'GetPrinters'
})

const printers = await api({})
```

## License

MIT
