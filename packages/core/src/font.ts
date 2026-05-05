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

export interface FontLoadRequest {
  family: string
  weight?: string
  style?: string
}

export interface FontLoadSuccess extends FontLoadRequest {
  source: FontSource
}

export interface FontLoadFailure extends FontLoadRequest {
  message: string
  cause: unknown
}

export interface FontBatchLoadOptions {
  onFailure?: (failure: FontLoadFailure) => void
  logFailures?: boolean
}

export interface FontBatchLoadResult {
  loaded: FontLoadSuccess[]
  failures: FontLoadFailure[]
}

export interface FontPreloadResult {
  loadedFamilies: string[]
  failures: FontLoadFailure[]
}

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
  private _inflight = new Map<string, Promise<FontSource>>()
  private _fontList?: FontDescriptor[]
  private _generation = 0

  constructor(provider?: FontProvider) {
    this._provider = provider
  }

  get provider(): FontProvider | undefined {
    return this._provider
  }

  setProvider(provider: FontProvider): void {
    this._provider = provider
    this._generation++
    this._cache.clear()
    this._inflight.clear()
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

    const inflight = this._inflight.get(key)
    if (inflight)
      return inflight

    if (!this._provider) {
      throw new Error(`No font provider configured, cannot load font: ${family}`)
    }

    const provider = this._provider
    const generation = this._generation
    const request = provider.loadFont(family, weight, style)
      .then((source) => {
        if (this._generation === generation && this._provider === provider) {
          this._cache.set(key, { source, loaded: true })
        }
        return source
      })
      .finally(() => {
        if (this._inflight.get(key) === request) {
          this._inflight.delete(key)
        }
      })

    this._inflight.set(key, request)
    return request
  }

  async loadFonts(requests: FontLoadRequest[], options: FontBatchLoadOptions = {}): Promise<FontBatchLoadResult> {
    const uniqueRequests = dedupeFontRequests(requests)
    if (uniqueRequests.length === 0) {
      return { loaded: [], failures: [] }
    }

    const settled = await Promise.allSettled(uniqueRequests.map(async (request) => {
      const source = await this.loadFont(request.family, request.weight, request.style)
      return { ...request, source }
    }))

    const result: FontBatchLoadResult = { loaded: [], failures: [] }
    const shouldLogFailures = options.logFailures ?? !options.onFailure

    settled.forEach((entry, index) => {
      if (entry.status === 'fulfilled') {
        result.loaded.push(entry.value)
        return
      }

      const failure = toFontLoadFailure(uniqueRequests[index]!, entry.reason)
      result.failures.push(failure)
      options.onFailure?.(failure)
      if (shouldLogFailures) {
        console.warn('[easyink] font preload failed', failure)
      }
    })

    return result
  }

  async preloadFonts(families: string[], options: FontBatchLoadOptions = {}): Promise<FontPreloadResult> {
    const result = await this.loadFonts(families.map(family => ({ family })), options)
    return {
      loadedFamilies: result.loaded.map(entry => entry.family),
      failures: result.failures,
    }
  }

  isLoaded(family: string, weight?: string, style?: string): boolean {
    const key = fontCacheKey(family, weight, style)
    return this._cache.get(key)?.loaded === true
  }

  clear(): void {
    this._generation++
    this._cache.clear()
    this._inflight.clear()
    this._fontList = undefined
  }
}

function fontCacheKey(family: string, weight?: string, style?: string): string {
  return `${family}|${weight || 'normal'}|${style || 'normal'}`
}

function dedupeFontRequests(requests: FontLoadRequest[]): FontLoadRequest[] {
  const deduped = new Map<string, FontLoadRequest>()
  for (const request of requests) {
    const key = fontCacheKey(request.family, request.weight, request.style)
    if (!deduped.has(key)) {
      deduped.set(key, request)
    }
  }
  return [...deduped.values()]
}

function toFontLoadFailure(request: FontLoadRequest, reason: unknown): FontLoadFailure {
  return {
    ...request,
    message: reason instanceof Error ? reason.message : String(reason),
    cause: normalizeFontLoadCause(reason),
  }
}

function normalizeFontLoadCause(reason: unknown): unknown {
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    }
  }
  return reason
}
