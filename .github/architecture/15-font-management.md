# 15. 字体管理

## 15.1 FontProvider 接口

核心不关心字体的存储和加载细节，通过 FontProvider 接口解耦。接口定义位于 `@easyink/core`，使用函数属性风格：

```typescript
interface FontProvider {
  /** 获取可用字体列表 */
  listFonts: () => Promise<FontDescriptor[]>

  /**
   * 加载字体文件
   * @returns CSS @font-face 所需的 font source（URL 或 ArrayBuffer）
   */
  loadFont: (fontFamily: string, weight?: string, style?: string) => Promise<FontSource>

  /**
   * 获取字体文件的原始数据（用于 PDF 嵌入）
   * 可选实现
   */
  getFontData?: (fontFamily: string) => Promise<ArrayBuffer>
}

interface FontDescriptor {
  family: string
  displayName: string
  weights: string[]    // ['400', '700']
  styles: string[]     // ['normal', 'italic']
  category?: string    // '衬线体' | '无衬线体' | '等宽体' | '手写体'
  preview?: string     // 预览文本或图片 URL
}

type FontSource = string | ArrayBuffer  // URL 或字体文件二进制
```

## 15.2 FontManager

FontManager 是 core 层的字体管理器，提供缓存和批量预加载能力。**不含 DOM 操作**（@font-face 注入留给 renderer 层）。

```typescript
class FontManager {
  constructor(provider?: FontProvider)

  /** 获取/设置 FontProvider */
  get provider(): FontProvider | undefined
  setProvider(provider: FontProvider): void

  /** 获取可用字体列表（代理到 provider） */
  listFonts(): Promise<FontDescriptor[]>

  /** 加载字体（带缓存，按 family+weight+style 组合作为缓存键） */
  loadFont(family: string, weight?: string, style?: string): Promise<FontSource>

  /** 批量预加载字体（Promise.allSettled，失败的不影响其他） */
  preloadFonts(families: string[]): Promise<void>

  /** 获取字体原始数据用于 PDF 嵌入（provider 不支持时 throw） */
  getFontData(family: string): Promise<ArrayBuffer>

  /** 检查字体是否已缓存 */
  isLoaded(family: string, weight?: string, style?: string): boolean

  /** 清理缓存 */
  clear(): void
}
```

## 15.3 使用方式

```typescript
// 消费者实现自己的 FontProvider
const myFontProvider: FontProvider = {
  async listFonts() {
    return [
      { family: 'SourceHanSans', displayName: '思源黑体', weights: ['400', '700'], styles: ['normal'] },
      { family: 'SourceHanSerif', displayName: '思源宋体', weights: ['400', '700'], styles: ['normal'] },
    ]
  },
  async loadFont(family) {
    return `https://my-cdn.com/fonts/${family}.woff2`
  },
  async getFontData(family) {
    const response = await fetch(`https://my-cdn.com/fonts/${family}.ttf`)
    return response.arrayBuffer()
  },
}

const engine = new EasyInkEngine({
  fontProvider: myFontProvider,
})

// 通过 engine.font 访问 FontManager
const fonts = await engine.font.listFonts()
await engine.font.preloadFonts(['SourceHanSans', 'SourceHanSerif'])
```
