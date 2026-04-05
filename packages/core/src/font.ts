/**
 * Font descriptor from a font provider.
 */
export interface FontDescriptor {
  family: string
  displayName: string
  weights: string[]
  styles: string[]
  category?: string
  preview?: string
}

/**
 * Font provider interface for loading font data.
 * Implemented by the host application.
 */
export interface FontProvider {
  listFonts: () => Promise<FontDescriptor[]>
  loadFont: (fontFamily: string, weight?: string, style?: string) => Promise<FontSource>
}

export type FontSource = string | ArrayBuffer

interface FontCacheEntry {
  source: FontSource
  loaded: boolean
}

/**
 * FontManager provides caching and batch preloading of fonts.
 * Contains no DOM operations -- @font-face injection is left to
 * the Viewer runtime or Designer preview host.
 */
export class FontManager {
  private _provider?: FontProvider
  private _cache = new Map<string, FontCacheEntry>()
  private _fontList?: FontDescriptor[]

  constructor(provider?: FontProvider) {
    this._provider = provider
  }

  get provider(): FontProvider | undefined {
    return this._provider
  }

  setProvider(provider: FontProvider): void {
    this._provider = provider
    this._cache.clear()
    this._fontList = undefined
  }

  async listFonts(): Promise<FontDescriptor[]> {
    if (this._fontList)
      return this._fontList
    if (!this._provider)
      return []
    this._fontList = await this._provider.listFonts()
    return this._fontList
  }

  async loadFont(family: string, weight?: string, style?: string): Promise<FontSource> {
    const key = fontCacheKey(family, weight, style)
    const cached = this._cache.get(key)
    if (cached)
      return cached.source

    if (!this._provider) {
      throw new Error(`No font provider configured, cannot load font: ${family}`)
    }

    const source = await this._provider.loadFont(family, weight, style)
    this._cache.set(key, { source, loaded: true })
    return source
  }

  async preloadFonts(families: string[]): Promise<void> {
    await Promise.all(families.map(f => this.loadFont(f).catch(() => {})))
  }

  isLoaded(family: string, weight?: string, style?: string): boolean {
    const key = fontCacheKey(family, weight, style)
    return this._cache.get(key)?.loaded === true
  }

  clear(): void {
    this._cache.clear()
    this._fontList = undefined
  }
}

function fontCacheKey(family: string, weight?: string, style?: string): string {
  return `${family}|${weight || 'normal'}|${style || 'normal'}`
}
