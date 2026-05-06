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

- Visual Studio 2019 或更高版本
- .NET Framework 4.8 SDK

## 兼容性

| 系统 | 支持情况 |
|------|---------|
| Windows 7 SP1 | 支持（需安装 .NET Framework 4.8 运行时） |
| Windows 8/8.1 | 支持 |
| Windows 10 | 支持 |
| Windows 11 | 支持 |

## 构建

```bash
# 构建打印插件
cd EasyInk.Printer
dotnet build src

# 运行测试
dotnet run --project tests
```

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
