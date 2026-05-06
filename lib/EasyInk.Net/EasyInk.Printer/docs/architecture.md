# EasyInk.Printer 架构文档

## 一、项目概述

EasyInk.Printer 是 EasyInk.Net 中的打印插件（DLL），提供打印机管理、PDF 渲染打印、任务队列、审计日志等能力。

可被以下宿主程序调用：
- **EasyInk.Printer.Host** — 本地 HTTP/WebSocket 服务 + 桌面管理界面（推荐）
- **Electron** — 通过 edge-js 调用（兼容方案）

## 二、目录结构

```
EasyInk.Printer/
├── src/
│   ├── EasyInk.Printer.csproj
│   ├── PrinterApi.cs             # 公共 API 入口
│   ├── Models/                   # 数据模型（一个文件一个类）
│   │   ├── PrinterCommand.cs     # 命令请求
│   │   ├── PrinterResult.cs      # 命令响应
│   │   ├── ErrorInfo.cs          # 错误信息
│   │   ├── PrinterInfo.cs        # 打印机信息
│   │   ├── PrinterStatus.cs      # 打印机状态
│   │   ├── PaperSizeInfo.cs      # 纸张尺寸信息
│   │   ├── PaperSizeParams.cs    # 纸张尺寸参数
│   │   ├── OffsetParams.cs       # 偏移参数
│   │   ├── UserDataParams.cs     # 用户数据参数
│   │   ├── PrintRequest.cs       # 打印请求参数
│   │   ├── PrintResult.cs        # 打印结果
│   │   ├── PrintJob.cs           # 打印任务信息
│   │   ├── PrintAuditLog.cs      # 审计日志
│   │   ├── BatchPrintRequest.cs  # 批量打印请求
│   │   ├── BatchPrintResult.cs   # 批量打印结果
│   │   └── BatchJobResult.cs     # 批量任务结果
│   └── Services/                 # 业务服务
│       ├── Abstractions/         # 接口定义
│       │   ├── IPrinterService.cs
│       │   ├── IPrintService.cs
│       │   ├── IPdfRenderService.cs
│       │   └── IAuditService.cs
│       ├── PrinterService.cs     # 打印机管理（WMI 查询）
│       ├── PrintService.cs       # 打印执行
│       ├── PdfRenderService.cs   # PDF 渲染
│       ├── AuditService.cs       # 审计日志（SQLite）
│       └── PrintJobQueue.cs      # 异步任务队列
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
│                   调用方（Host / Electron）                   │
│                                                             │
│  EasyInk.Printer.Host           或        edge-js           │
│  (HTTP/WS 服务)                             (Node.js)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      PrinterApi                              │
│                    (公共 API 入口)                            │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│ Printer     │ Print       │ PdfRender   │ Audit             │
│ Service     │ Service     │ Service     │ Service           │
│ (WMI)       │ (PrintDoc)  │ (PDFium)    │ (SQLite)          │
├─────────────┴─────────────┼─────────────┴───────────────────┤
│                     PrintJobQueue                            │
│                   (异步任务队列)                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

- **运行时**：.NET Framework 4.8（兼容 Windows 7 SP1 及以上）
- **打印 API**：`System.Drawing.Printing` + `PrintDocument`
- **PDF 渲染**：PDFium（通过 PdfiumViewer）
- **打印机状态**：WMI（`Win32_Printer`）
- **数据库**：SQLite + Dapper
- **JSON 序列化**：Newtonsoft.Json（camelCase）

## 四、公共 API

### 4.1 PrinterApi 类

```csharp
public class PrinterApi : IDisposable
{
    // 构造函数
    public PrinterApi(string dbPath = null);

    // 获取打印机列表（JSON）
    string GetPrinters();

    // 获取打印机状态（JSON）
    string GetPrinterStatus(string printerName);

    // 同步打印
    string Print(string printerName, string pdfBase64, int copies, ...);

    // 异步打印
    string PrintAsync(string printerName, string pdfBase64, int copies, ...);

    // 批量打印
    string BatchPrint(string jobsJson);
    string BatchPrintAsync(string jobsJson);

    // 任务状态查询
    string GetJobStatus(string jobId);

    // 审计日志查询
    string QueryLogs(DateTime? startTime, DateTime? endTime, ...);

    // JSON 命令入口（统一接口）
    string HandleCommand(string json);
}
```

### 4.2 命令格式

所有方法返回 JSON，格式统一为 `PrinterResult`：

```json
{
  "id": "请求ID",
  "success": true,
  "data": {},
  "errorInfo": null
}
```

`HandleCommand` 接收 `PrinterCommand`：

```json
{
  "command": "print",
  "id": "uuid",
  "params": { ... }
}
```

## 五、数据库设计

### PrintAuditLog 表

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

## 六、错误码

| 错误码 | 说明 |
|--------|------|
| `PRINTER_NOT_FOUND` | 打印机不存在 |
| `PRINTER_OFFLINE` | 打印机离线 |
| `PRINTER_STOPPED` | 打印机已停止 |
| `PAPER_JAM` | 打印机卡纸 |
| `PAPER_OUT` | 打印机缺纸 |
| `PRINTER_ERROR` | 打印机错误 |
| `INVALID_PDF` | PDF 格式无效 |
| `PRINT_FAILED` | 打印失败 |
| `INVALID_PARAMS` | 参数无效 |
| `UNKNOWN_COMMAND` | 未知命令 |
| `JOB_NOT_FOUND` | 任务不存在 |

## 七、构建与部署

```bash
# 构建
dotnet build EasyInk.Printer/src

# 发布
dotnet publish EasyInk.Printer/src -c Release

# 运行测试
dotnet run --project EasyInk.Printer/tests
```

---

**文档版本**：v2.0
**更新日期**：2026-05-06
**更新内容**：命名优化（PrinterCommand/PrinterResult/PrintJob），模型文件拆分为一个文件一个类
