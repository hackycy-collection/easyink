# 16. PDF 生成管线

## 16.1 可插拔 PDF 管线

核心定义 `PDFGenerator` 接口，内置提供客户端和服务端两种实现：

```typescript
interface PDFGenerator {
  /** 生成器标识 */
  readonly name: string

  /**
   * 从渲染结果生成 PDF
   * @param pages - DOM 渲染产生的页面列表
   * @param options - PDF 选项
   */
  generate(pages: HTMLElement[], options: PDFOptions): Promise<Blob | ArrayBuffer>
}

interface PDFOptions {
  /** 页面尺寸 */
  width: number
  height: number
  /** 单位 */
  unit: 'mm' | 'inch' | 'pt'
  /** DPI */
  dpi?: number
  /** 是否嵌入字体 */
  embedFonts?: boolean
  /** 文件元信息 */
  meta?: {
    title?: string
    author?: string
    subject?: string
  }
}
```

## 16.2 内置实现

**客户端 PDF 生成器**（基于 jsPDF + html2canvas 或 pdf-lib）：

```typescript
import { ClientPDFGenerator } from '@easyink/renderer/pdf'

const pdfGenerator = new ClientPDFGenerator({
  /** html-to-canvas 的质量配置 */
  scale: 2,
  /** 是否使用 pdf-lib 做矢量文本（精度更高但不支持复杂布局） */
  vectorText: false,
})
```

**服务端 PDF 生成器**（通过 API 调用后端 Puppeteer/Playwright）：

```typescript
import { ServerPDFGenerator } from '@easyink/renderer/pdf'

const pdfGenerator = new ServerPDFGenerator({
  /** 服务端渲染 API 地址 */
  endpoint: 'https://api.example.com/render/pdf',
  /** 请求超时 */
  timeout: 30000,
})
```

**自定义 PDF 生成器**：

```typescript
// 消费者可完全自定义 PDF 生成逻辑
const customGenerator: PDFGenerator = {
  name: 'my-pdf-generator',
  async generate(pages, options) {
    // 自定义实现...
    return pdfBlob
  },
}
```
