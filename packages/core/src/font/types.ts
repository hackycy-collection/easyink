/**
 * 字体描述信息
 */
export interface FontDescriptor {
  /** 字体族名（CSS font-family 值） */
  family: string
  /** 显示名称 */
  displayName: string
  /** 可用字重 */
  weights: string[]
  /** 可用样式 */
  styles: string[]
  /** 字体分类 */
  category?: string
  /** 预览文本或图片 URL */
  preview?: string
}

/**
 * 字体数据源 — URL 或字体文件二进制
 */
export type FontSource = string | ArrayBuffer

/**
 * FontProvider — 字体提供者接口
 *
 * 核心不关心字体的存储和加载细节，通过此接口解耦。
 * 消费者实现自己的 FontProvider。
 */
export interface FontProvider {
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
