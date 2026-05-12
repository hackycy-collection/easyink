# 快速上手

本指南帮助你在 5 分钟内运行 EasyInk.Printer 打印服务。

## 方式一：下载预构建产物（推荐）

每次发版都会将 .NET 产物发布到 GitHub Release，无需本地构建：

1. 前往 [GitHub Releases](https://github.com/hackycy/easyink/releases)
2. 下载最新版本的 `EasyInk.Printer` 压缩包
3. 解压后直接运行 `EasyInk.Printer.exe`

跳转到 [验证](#验证) 确认服务是否正常。

## 方式二：从源码构建

### 环境准备

- Windows 7 SP1 及以上
- [.NET SDK](https://dotnet.microsoft.com/download)（推荐 10.0+，支持 net48 构建）

### 构建

```bash
cd lib/EasyInk.Net

# 构建打印引擎
dotnet build EasyInk.Engine/src

# 构建打印服务应用
dotnet build EasyInk.Printer/src
```

首次构建前需要下载 SumatraPDF（PDF 矢量直通打印引擎）：

```bash
cd lib/EasyInk.Net/EasyInk.Printer
powershell -File tools/download-sumatra.ps1
```

> 下载预构建产物时，SumatraPDF 已包含在内，无需额外操作。

### 运行

启动 EasyInk.Printer，它会在 `http://localhost:18080` 提供 HTTP 服务：

```bash
dotnet run --project EasyInk.Printer/src
```

启动后系统托盘会出现图标，双击可打开管理窗口（仪表盘、打印机列表、任务队列、审计日志、设置）。

## 验证

```bash
# 查看服务状态
curl http://localhost:18080/api/status

# 获取打印机列表
curl http://localhost:18080/api/printers

# 打印测试（Base64 PDF）
curl -X POST http://localhost:18080/api/print \
  -H "Content-Type: application/json" \
  -d '{"printerName":"你的打印机名","pdfBase64":"JVBERi0xLjQK...","copies":1}'
```

## 从前端调用

### HTTP 方式

```ts
// 打印
const response = await fetch('http://localhost:18080/api/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    printerName: 'HP LaserJet',
    pdfBase64: pdfBase64String,
    copies: 1,
  }),
})
const result = await response.json()
// result.success === true 表示打印成功
```

### WebSocket 方式

```ts
const ws = new WebSocket('ws://localhost:18080/ws')

ws.onopen = () => {
  ws.send(JSON.stringify({
    command: 'print',
    id: crypto.randomUUID(),
    params: {
      printerName: 'HP LaserJet',
      pdfBase64: pdfBase64String,
      copies: 1,
    },
  }))
}

ws.onmessage = (event) => {
  const result = JSON.parse(event.data)
  console.log(result)
}
```

## 上传文件打印（二进制）

对于大 PDF 文件，使用 multipart/form-data 上传：

```ts
const formData = new FormData()
formData.append('params', JSON.stringify({
  printerName: 'HP LaserJet',
  copies: 1,
}))
formData.append('pdf', pdfFile) // File 对象

const response = await fetch('http://localhost:18080/api/print', {
  method: 'POST',
  body: formData,
})
```

## 打印机选择

如果不确定打印机名称，先查询可用打印机：

```ts
const response = await fetch('http://localhost:18080/api/printers')
const { data } = await response.json()
// data.printers 是打印机信息数组
console.log(data.printers.map(p => p.name))
```

## 配置

配置文件位于 `%APPDATA%/EasyInk.Printer/config.json`，首次运行时自动生成。常用配置：

```json
{
  "httpPort": 18080,
  "autoStart": false,
  "minimizeToTray": true,
  "startMinimized": true
}
```

完整配置项见 [Printer 应用](./printer#配置)。

## 下一步

- [Engine DLL](./engine) -- 在 .NET 应用中直接集成打印引擎
- [Printer 应用](./printer) -- 完整的独立打印服务应用
- [API 参考](./api-reference) -- HTTP / WebSocket 接口详细文档
