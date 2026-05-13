# EasyInk.Engine

EasyInk.Engine 是纯打印引擎 DLL，仅负责打印链路，不包含 UI、HTTP 服务或持久化逻辑。适合嵌入到自有 .NET 应用中。

## 设计原则

- **无 UI 依赖**：不引用 WinForms/WPF，可嵌入任何宿主
- **无持久化**：日志通过静态事件 `EngineApi.Log` 回传，由宿主决定存储方式
- **策略模式**：PDF 来源（Base64 / URL / Binary）通过 `IPdfProvider` 抽象，可扩展
- **接口驱动**：`IPrinterService` 和 `IPrintService` 可替换默认实现

## 架构

```
EngineApi (公共入口)
├── IPrinterService          ← 打印机枚举/状态查询
│   └── PrinterService       ← 默认实现：WMI 查询
├── IPrintService            ← 打印执行
│   └── PdfiumPrintService   ← 默认实现：Pdfium 渲染 + Windows Print Spooler
├── PrintJobQueue            ← 异步队列（BlockingCollection + 后台线程）
└── IPdfProvider             ← PDF 数据源策略
    ├── Base64PdfProvider
    ├── BlobPdfProvider
    └── UrlPdfProvider       ← 含 SSRF 防护（屏蔽私有 IP）
```

## 引入方式

### 方式一：构建源码

```bash
cd lib/EasyInk.Net
dotnet build EasyInk.Engine/src
```

产物在 `EasyInk.Engine/src/bin/Debug/net48/EasyInk.Engine.dll`。

### 方式二：使用 CI 产物

从 GitHub Actions 的 `build-easyink-dotnet.yml` workflow 下载 `easyink-engine-sdk-*` zip，解压后引用 `EasyInk.Engine.dll`。

## 基本用法

```csharp
using EasyInk.Engine;

// 创建引擎（默认使用 Pdfium + Windows Print Spooler）
using var api = new EngineApi();
```

## 核心 API

### 列出打印机

```csharp
string printersJson = api.GetPrinters();
```

### 同步打印

三种 PDF 来源任选其一：

```csharp
// Base64
string result = api.Print("HP LaserJet", pdfBase64: "JVBERi0xLjQK...");

// 远程 URL
string result = api.Print("HP LaserJet", pdfUrl: "https://example.com/doc.pdf");

// 二进制
string result = api.Print("HP LaserJet", pdfBytes: File.ReadAllBytes("doc.pdf"));
```

### 异步打印

入队后立即返回 jobId，后台线程执行打印：

```csharp
string queued = api.EnqueuePrint("HP LaserJet", pdfBase64: "...");

// 解析 jobId 后轮询状态
string status = api.GetJobStatus(jobId);
```

### 命令协议

通过 `HandleCommand` 以对象方式调用，避免 JSON 序列化往返：

```csharp
PrinterResult result = api.HandleCommand(new PrinterCommand {
    Command = "print",
    Id = "req-1",
    Params = new Dictionary<string, object> {
        ["printerName"] = "HP LaserJet",
        ["pdfBase64"] = "...",
        ["copies"] = 2
    }
});
```

支持的命令：

| 命令 | 参数 | 说明 |
|------|------|------|
| `getPrinters` | - | 获取打印机列表 |
| `getPrinterStatus` | `printerName` | 获取打印机状态 |
| `print` | `printerName`, `pdfBase64`/`pdfUrl`/`pdfBytes`, `copies`? | 同步打印 |
| `printAsync` | 同上 | 异步打印 |
| `getJobStatus` | `jobId` | 查询任务状态 |
| `getAllJobs` | - | 所有任务 |
| `batchPrint` | `jobs[]` | 批量同步打印 |
| `batchPrintAsync` | `jobs[]` | 批量异步打印 |

## 方法一览

| 方法 | 说明 |
|------|------|
| `GetPrinters()` | 获取打印机列表（JSON） |
| `GetPrinterStatus(printerName)` | 获取打印机状态（JSON） |
| `Print(printerName, pdfBase64?, pdfUrl?, pdfBytes?, ...)` | 同步打印 |
| `EnqueuePrint(printerName, pdfBase64?, pdfUrl?, pdfBytes?, ...)` | 入队打印 |
| `BatchPrint(jobsJson)` | 批量同步打印 |
| `EnqueueBatchPrint(jobsJson)` | 批量入队打印 |
| `GetJobStatus(jobId)` | 查询任务状态 |
| `GetAllJobs()` | 获取所有任务 |
| `HandleCommand(json)` | JSON 命令入口（字符串） |
| `HandleCommand(command)` | 命令入口（对象） |

## 日志订阅

```csharp
EngineApi.Log += (level, message) =>
{
    // level: LogLevel.Info / LogLevel.Error
    Console.WriteLine($"[{level}] {message}");
};
```

## 数据模型

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

热敏小票机、连续纸建议保持 `ForcePaperSize=false`，让驱动使用当前介质。只有标签机等驱动不收到自定义尺寸会回退到 A4 时，才设为 `true`。

三种 PDF 来源互斥，只能提供其一。

### PrinterResult

```csharp
{
    Id: string,          // 请求 ID
    Success: bool,       // 是否成功
    Data: object,        // 返回数据
    ErrorInfo: { Code: string, Message: string }  // 错误信息
}
```

### JobStatus

`Queued` / `Printing` / `Completed` / `Failed`

### PrinterStatusCode

`Ready` / `PrinterOffline` / `PaperJam` / `PaperOut` / `PrinterStopped` / `PrinterError` / `PrinterNotFound`

## 扩展点

### 自定义打印服务

实现 `IPrintService` 接口可替换默认打印实现：

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

实现 `IPrinterService` 接口可替换 WMI 查询，例如对接远程打印机管理。

## 依赖

| 包 | 说明 |
|----|------|
| Newtonsoft.Json | JSON 序列化 |
| PdfiumViewer | PDF 渲染（Chromium 同款 PDF 引擎） |
| System.Drawing | 图像处理 / 打印输出 |
| System.Management | WMI 查询（打印机状态） |
