# EasyInk.Engine

EasyInk 的打印引擎，纯 .NET 类库（DLL），仅负责打印链路，不包含 UI、HTTP 服务或持久化逻辑。

## 设计原则

- **无 UI 依赖**：不引用 WinForms/WPF，可嵌入任何宿主
- **无持久化**：日志通过静态事件 `EngineApi.Log` 回传，由宿主决定存储方式
- **策略模式**：PDF 来源（Base64/URL/Binary）通过 `IPdfProvider` 抽象，可扩展
- **接口驱动**：`IPrinterService` 和 `IPrintService` 可替换默认实现（WMI / SumatraPDF）

## 架构

```
EngineApi (公共入口)
├── IPrinterService          ← 打印机枚举/状态查询
│   └── PrinterService       ← 默认实现：WMI 查询
├── IPrintService            ← 打印执行
│   └── SumatraPrintService  ← 默认实现：SumatraPDF 矢量直通
├── PrintJobQueue            ← 异步队列（BlockingCollection + 后台线程）
└── IPdfProvider             ← PDF 数据源策略
    ├── Base64PdfProvider
    ├── BlobPdfProvider
    └── UrlPdfProvider       ← 含 SSRF 防护（屏蔽私有 IP）
```

## 公共 API

### EngineApi

```csharp
// 使用默认实现（WMI + SumatraPDF）
using var api = new EngineApi();

// 或注入自定义实现
using var api = new EngineApi(printerService, printService);

// 或指定 SumatraPDF 路径
using var api = new EngineApi(sumatraPdfExePath: @"C:\tools\SumatraPDF.exe");
```

#### 方法一览

| 方法 | 说明 |
|------|------|
| `GetPrinters()` | 获取打印机列表 |
| `GetPrinterStatus(printerName)` | 获取打印机状态 |
| `Print(printerName, pdfBase64?, pdfUrl?, pdfBytes?, ...)` | 同步打印 |
| `EnqueuePrint(printerName, pdfBase64?, pdfUrl?, pdfBytes?, ...)` | 入队打印（立即返回 jobId） |
| `BatchPrint(jobsJson)` | 批量同步打印 |
| `EnqueueBatchPrint(jobsJson)` | 批量入队打印 |
| `GetJobStatus(jobId)` | 查询任务状态 |
| `GetAllJobs()` | 获取所有任务 |
| `HandleCommand(json)` | JSON 命令入口（字符串） |
| `HandleCommand(command)` | 命令入口（对象，避免序列化往返） |

所有方法返回 JSON 字符串（`HandleCommand(PrinterCommand)` 返回 `PrinterResult` 对象）。

### 命令协议

`HandleCommand` 接收 `PrinterCommand`，支持以下命令：

| 命令 | 参数 | 说明 |
|------|------|------|
| `getPrinters` | - | 获取打印机列表 |
| `getPrinterStatus` | `printerName` | 获取打印机状态 |
| `print` | `printerName`, `pdfBase64`/`pdfUrl`/`pdfBytes`, `copies`? | 同步打印 |
| `printAsync` | 同上 | 异步打印 |
| `getJobStatus` | `jobId` | 查询任务 |
| `getAllJobs` | - | 所有任务 |
| `batchPrint` | `jobs[]` | 批量同步 |
| `batchPrintAsync` | `jobs[]` | 批量异步 |

## 数据模型

### PrinterResult

统一响应格式：

```csharp
{
    Id: string,
    Success: bool,
    Data: object,
    ErrorInfo: { Code: string, Message: string }
}
```

### PrintRequestParams

| 属性 | 类型 | 说明 |
|------|------|------|
| PrinterName | string | 打印机名称 |
| PdfBase64 | string | Base64 编码的 PDF |
| PdfUrl | string | 远程 PDF URL |
| PdfBytes | byte[] | 二进制 PDF |
| Copies | int | 份数，默认 1 |
| Landscape | bool | 横向打印 |
| Dpi | int | 分辨率，默认 300 |
| PaperSize | PaperSizeParams | PDF/模板纸张尺寸 |
| ForcePaperSize | bool | 是否强制把 PaperSize 下发为驱动纸张参数，默认 false |
| Offset | OffsetParams | 打印偏移 |
| UserData | UserDataParams | 自定义数据（用户ID、标签类型） |

三种 PDF 来源互斥，只能提供其一。

### PrinterStatus

| 属性 | 说明 |
|------|------|
| IsReady | 是否就绪 |
| StatusCode | 状态码（`READY`/`PRINTER_OFFLINE`/`PAPER_JAM` 等） |
| Message | 人类可读描述 |
| IsOnline | 是否在线 |
| HasPaper | 是否有纸 |

## 常量定义

| 类 | 常量 | 用途 |
|----|------|------|
| `JobStatus` | `Queued`, `Printing`, `Completed`, `Failed` | 任务状态 |
| `PrinterStatusCode` | `Ready`, `PrinterOffline`, `PaperJam`, `PaperOut`, `PrinterStopped`, `PrinterError`, `PrinterNotFound` | 打印机状态码 |
| `ErrorCode` | `InvalidParams`, `InvalidJson`, `UnknownCommand`, `JobNotFound`, `QueueFull`, `SumatraNotFound`, `PrintFailed`, `PrintTimeout`, `InvalidPdfSource`, `Unauthorized`, `NotFound` 等 | 错误码 |

## 日志订阅

```csharp
EngineApi.Log += (level, message) =>
{
    // level: LogLevel.Info / LogLevel.Error
    Console.WriteLine($"[{level}] {message}");
};
```

## 扩展点

### 自定义打印服务

实现 `IPrintService` 接口可替换 SumatraPDF：

```csharp
public class MyPrintService : IPrintService
{
    public PrinterResult Print(string requestId, PrintRequestParams request)
    {
        // 自定义打印逻辑
        return PrinterResult.Ok(requestId, PrintResult.Success(requestId));
    }
}

using var api = new EngineApi(printService: new MyPrintService());
```

### 自定义打印机服务

实现 `IPrinterService` 接口可替换 WMI 查询（例如远程打印机管理）。

## 依赖

| 包 | 说明 |
|----|------|
| Newtonsoft.Json | JSON 序列化 |
| System.Drawing | 图像处理（纸张尺寸） |
| System.Management | WMI 查询（打印机状态） |

## 构建

```bash
cd lib/EasyInk.Net
dotnet build EasyInk.Engine/src
dotnet test EasyInk.Engine/tests
```
