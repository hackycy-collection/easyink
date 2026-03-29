import type { FontDescriptor, FontProvider, FontSource } from './types'

/**
 * FontManager — 字体管理器
 *
 * 管理字体的加载和缓存。core 层纯逻辑类，不包含 DOM 操作
 * （@font-face 注入留给 renderer 层）。
 */
export class FontManager {
  private _provider?: FontProvider
  private _cache = new Map<string, FontSource>()

  constructor(provider?: FontProvider) {
    this._provider = provider
  }

  /** 获取当前 FontProvider */
  get provider(): FontProvider | undefined {
    return this._provider
  }

  /** 设置 FontProvider */
  setProvider(provider: FontProvider): void {
    this._provider = provider
  }

  /**
   * 获取可用字体列表
   * @throws {Error} 未设置 FontProvider
   */
  async listFonts(): Promise<FontDescriptor[]> {
    this._ensureProvider()
    return this._provider!.listFonts()
  }

  /**
   * 加载字体（带缓存）
   * @throws {Error} 未设置 FontProvider
   */
  async loadFont(family: string, weight?: string, style?: string): Promise<FontSource> {
    this._ensureProvider()

    const cacheKey = this._buildCacheKey(family, weight, style)
    const cached = this._cache.get(cacheKey)
    if (cached !== undefined)
      return cached

    const source = await this._provider!.loadFont(family, weight, style)
    this._cache.set(cacheKey, source)
    return source
  }

  /**
   * 批量预加载字体
   *
   * 使用 Promise.allSettled 确保失败的字体不影响其他字体加载。
   */
  async preloadFonts(families: string[]): Promise<void> {
    this._ensureProvider()
    await Promise.allSettled(
      families.map(family => this.loadFont(family)),
    )
  }

  /**
   * 获取字体文件的原始数据（用于 PDF 嵌入）
   * @throws {Error} 未设置 FontProvider 或 provider 不支持 getFontData
   */
  async getFontData(family: string): Promise<ArrayBuffer> {
    this._ensureProvider()
    if (!this._provider!.getFontData) {
      throw new Error('FontProvider does not support getFontData')
    }
    return this._provider!.getFontData(family)
  }

  /**
   * 检查字体是否已缓存加载
   */
  isLoaded(family: string, weight?: string, style?: string): boolean {
    return this._cache.has(this._buildCacheKey(family, weight, style))
  }

  /** 清理缓存 */
  clear(): void {
    this._cache.clear()
  }

  private _ensureProvider(): void {
    if (!this._provider) {
      throw new Error('FontProvider is not set. Call setProvider() or pass a provider to the constructor.')
    }
  }

  private _buildCacheKey(family: string, weight?: string, style?: string): string {
    return `${family}:${weight ?? '400'}:${style ?? 'normal'}`
  }
}
