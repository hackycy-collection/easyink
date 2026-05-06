# EasyInk.Printer 架构文档

## 一、项目概述

EasyInk.Printer 是 EasyInk.Net 中的打印插件，用于替代浏览器方案实现静默打印。通过 Electron 的 edge-js 或 node-ffi 调用 DLL。

## 二、目录结构

```
EasyInk.Net/
└── EasyInk.Printer/
    ├── src/
    │   ├── EasyInk.Printer.csproj    # 项目文件
    │   ├── PrinterApi.cs             # 公共 API 入口
    │   ├── Models/                   # 数据模型
    │   └── Services/                 # 业务服务
    ├── tests/
    │   ├── EasyInk.Printer.Tests.csproj
    │   └── Program.cs
    └── docs/
        └── architecture.md
```

## 三、技术架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  渲染进程    │    │  puppeteer  │    │  edge-js /  │      │
│  │  (Vue)      │───▶│  生成PDF    │───▶│  node-ffi   │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    EasyInk.Printer.dll                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  PrinterApi  │    │  PrintService│    │  SQLite日志  │      │
│  │  (公共API)   │───▶│  (Windows API)│───▶│  (审计记录)  │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

- **运行时**：.NET Framework 4.8（兼容 Windows 7 SP1 及以上）
- **打印 API**：`System.Drawing.Printing` + `PrintDocument`
- **PDF 渲染**：PDFium（轻量级 PDF 渲染库）
- **数据库**：SQLite + Dapper（轻量级 ORM）
- **JSON 序列化**：Newtonsoft.Json

### 3.3 兼容性

| 系统 | 支持情况 |
|------|---------|
| Windows 7 SP1 | 支持（需安装 .NET Framework 4.8） |
| Windows 8/8.1 | 支持 |
| Windows 10 | 支持 |
| Windows 11 | 支持 |

### 3.4 输出产物

- **主产物**：`EasyInk.Printer.dll`（类库）
- **测试产物**：`EasyInk.Printer.Tests.exe`（控制台应用）
- **依赖项**：
  - `Newtonsoft.Json.dll`
  - `Dapper.dll`
  - `System.Data.SQLite.dll`

## 四、公共 API

### 4.1 PrinterApi 类

```csharp
public class PrinterApi
{
    // 构造函数，可选指定数据库路径
    public PrinterApi(string dbPath = null);

    // 获取打印机列表（返回JSON）
    public string GetPrinters();

    // 获取打印机状态（返回JSON）
    public string GetPrinterStatus(string printerName);

    // 打印PDF（返回JSON）
    public string Print(
        string printerName,
        string pdfBase64,
        int copies = 1,
        double? paperWidth = null,
        double? paperHeight = null,
        string paperUnit = "mm",
        int dpi = 300,
        double? offsetX = null,
        double? offsetY = null,
        string offsetUnit = "mm",
        string userId = null,
        string labelType = null
    );

    // 查询审计日志（返回JSON）
    public string QueryLogs(
        DateTime? startTime = null,
        DateTime? endTime = null,
        string printerName = null,
        string userId = null,
        string status = null,
        int limit = 100,
        int offset = 0
    );

    // 处理JSON命令（兼容stdin模式）
    public string HandleCommand(string json);
}
```

### 4.2 使用示例

#### C# 直接调用

```csharp
var api = new PrinterApi();

// 获取打印机列表
var printers = api.GetPrinters();

// 打印PDF
var result = api.Print(
    printerName: "ZDesigner GK420t",
    pdfBase64: "...",
    copies: 1,
    paperWidth: 40,
    paperHeight: 30,
    paperUnit: "mm",
    dpi: 300
);
```

#### Electron 通过 edge-js 调用

```javascript
const edge = require('edge-js')

const print = edge.func({
  assemblyFile: 'path/to/EasyInk.Printer.dll',
  typeName: 'EasyInk.Printer.PrinterApi',
  methodName: 'Print'
})

const result = await print({
  printerName: 'ZDesigner GK420t',
  pdfBase64: '...',
  copies: 1,
  paperWidth: 40,
  paperHeight: 30
})
```

## 五、通信协议

### 5.1 JSON 命令模式

通过 `HandleCommand` 方法处理 JSON 命令：

```json
{
  "command": "print",
  "id": "uuid-string",
  "params": {
    "printerName": "ZDesigner GK420t",
    "pdfBase64": "base64-encoded-pdf",
    "copies": 1,
    "paperSize": {
      "width": 40,
      "height": 30,
      "unit": "mm"
    },
    "dpi": 300,
    "userData": {
      "userId": "user123",
      "labelType": "product"
    }
  }
}
```

### 5.2 响应格式

```json
{
  "id": "uuid-string",
  "success": true,
  "data": {
    "jobId": "print-job-uuid",
    "status": "completed"
  },
  "error": null
}
```

## 六、数据库设计

### 6.1 PrintAuditLog 表

```sql
CREATE TABLE PrintAuditLog (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Timestamp DATETIME NOT NULL,
    PrinterName TEXT NOT NULL,
    PaperWidth REAL,
    PaperHeight REAL,
    PaperUnit TEXT DEFAULT 'mm',
    Copies INTEGER DEFAULT 1,
    Dpi INTEGER,
    UserId TEXT,
    LabelType TEXT,
    Status TEXT NOT NULL,
    ErrorMessage TEXT,
    JobId TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 七、错误码定义

| 错误码 | 说明 |
|--------|------|
| `PRINTER_NOT_FOUND` | 打印机不存在 |
| `PRINTER_OFFLINE` | 打印机离线 |
| `PRINTER_ERROR` | 打印机错误 |
| `INVALID_PDF` | PDF 格式无效 |
| `PRINT_FAILED` | 打印失败 |
| `INVALID_PARAMS` | 参数无效 |
| `UNKNOWN_COMMAND` | 未知命令 |

## 八、构建与发布

### 8.1 前置要求

- Visual Studio 2019 或更高版本
- .NET Framework 4.8 SDK

### 8.2 构建

```bash
cd lib/EasyInk.Net/EasyInk.Printer
dotnet build src
```

### 8.3 发布

```bash
dotnet publish src -c Release
```

### 8.4 输出目录

```
src/bin/Release/net48/
├── EasyInk.Printer.dll          # 主类库
├── EasyInk.Printer.pdb          # 调试符号
├── Newtonsoft.Json.dll           # JSON 库
├── Dapper.dll                    # ORM
├── System.Data.SQLite.dll        # SQLite
└── ...
```

### 8.5 部署说明

目标机器需要安装 .NET Framework 4.8 运行时：
- Windows 10 1903+ 已内置
- Windows 7/8/8.1 需要单独下载安装

下载地址：https://dotnet.microsoft.com/download/dotnet-framework/net48

## 九、后续扩展

- 批量打印支持
- 打印模板系统
- 更多打印机状态监控
- 打印任务队列

---

**文档版本**：v1.2
**更新日期**：2026-05-06
**更新内容**：调整目录结构为 src/tests 分离
