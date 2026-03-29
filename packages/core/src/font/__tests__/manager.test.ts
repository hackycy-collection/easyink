import type { FontProvider } from '../types'
import { describe, expect, it, vi } from 'vitest'
import { FontManager } from '../manager'

function createMockProvider(overrides?: Partial<FontProvider>): FontProvider {
  return {
    listFonts: vi.fn().mockResolvedValue([
      { family: 'TestSans', displayName: '测试黑体', weights: ['400', '700'], styles: ['normal'] },
      { family: 'TestSerif', displayName: '测试宋体', weights: ['400'], styles: ['normal', 'italic'] },
    ]),
    loadFont: vi.fn().mockResolvedValue('https://cdn.example.com/fonts/test.woff2'),
    ...overrides,
  }
}

describe('fontManager', () => {
  describe('constructor', () => {
    it('should create without provider', () => {
      const manager = new FontManager()
      expect(manager.provider).toBeUndefined()
    })

    it('should create with provider', () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)
      expect(manager.provider).toBe(provider)
    })
  })

  describe('setProvider', () => {
    it('should set provider after construction', () => {
      const manager = new FontManager()
      const provider = createMockProvider()
      manager.setProvider(provider)
      expect(manager.provider).toBe(provider)
    })
  })

  describe('listFonts', () => {
    it('should throw without provider', async () => {
      const manager = new FontManager()
      await expect(manager.listFonts()).rejects.toThrow('FontProvider is not set')
    })

    it('should delegate to provider', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)
      const fonts = await manager.listFonts()
      expect(fonts).toHaveLength(2)
      expect(fonts[0].family).toBe('TestSans')
      expect(provider.listFonts).toHaveBeenCalledOnce()
    })
  })

  describe('loadFont', () => {
    it('should throw without provider', async () => {
      const manager = new FontManager()
      await expect(manager.loadFont('TestSans')).rejects.toThrow('FontProvider is not set')
    })

    it('should load font from provider', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)
      const source = await manager.loadFont('TestSans')
      expect(source).toBe('https://cdn.example.com/fonts/test.woff2')
      expect(provider.loadFont).toHaveBeenCalledWith('TestSans', undefined, undefined)
    })

    it('should pass weight and style to provider', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)
      await manager.loadFont('TestSans', '700', 'italic')
      expect(provider.loadFont).toHaveBeenCalledWith('TestSans', '700', 'italic')
    })

    it('should cache loaded fonts', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)

      await manager.loadFont('TestSans')
      await manager.loadFont('TestSans')

      expect(provider.loadFont).toHaveBeenCalledTimes(1)
    })

    it('should cache by family+weight+style combination', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)

      await manager.loadFont('TestSans', '400', 'normal')
      await manager.loadFont('TestSans', '700', 'normal')

      expect(provider.loadFont).toHaveBeenCalledTimes(2)
    })
  })

  describe('preloadFonts', () => {
    it('should throw without provider', async () => {
      const manager = new FontManager()
      await expect(manager.preloadFonts(['TestSans'])).rejects.toThrow('FontProvider is not set')
    })

    it('should preload multiple fonts', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)

      await manager.preloadFonts(['TestSans', 'TestSerif'])

      expect(provider.loadFont).toHaveBeenCalledTimes(2)
      expect(manager.isLoaded('TestSans')).toBe(true)
      expect(manager.isLoaded('TestSerif')).toBe(true)
    })

    it('should not throw when a font fails to load', async () => {
      const provider = createMockProvider({
        loadFont: vi.fn()
          .mockResolvedValueOnce('url1')
          .mockRejectedValueOnce(new Error('network error')),
      })
      const manager = new FontManager(provider)

      await expect(manager.preloadFonts(['TestSans', 'FailFont'])).resolves.toBeUndefined()
      expect(manager.isLoaded('TestSans')).toBe(true)
      expect(manager.isLoaded('FailFont')).toBe(false)
    })
  })

  describe('getFontData', () => {
    it('should throw without provider', async () => {
      const manager = new FontManager()
      await expect(manager.getFontData('TestSans')).rejects.toThrow('FontProvider is not set')
    })

    it('should throw when provider does not support getFontData', async () => {
      const provider = createMockProvider()
      const manager = new FontManager(provider)
      await expect(manager.getFontData('TestSans')).rejects.toThrow('does not support getFontData')
    })

    it('should delegate to provider.getFontData', async () => {
      const buffer = new ArrayBuffer(8)
      const provider = createMockProvider({
        getFontData: vi.fn().mockResolvedValue(buffer),
      })
      const manager = new FontManager(provider)
      const result = await manager.getFontData('TestSans')
      expect(result).toBe(buffer)
      expect(provider.getFontData).toHaveBeenCalledWith('TestSans')
    })
  })

  describe('isLoaded', () => {
    it('should return false for unloaded font', () => {
      const manager = new FontManager(createMockProvider())
      expect(manager.isLoaded('TestSans')).toBe(false)
    })

    it('should return true after loading', async () => {
      const manager = new FontManager(createMockProvider())
      await manager.loadFont('TestSans')
      expect(manager.isLoaded('TestSans')).toBe(true)
    })

    it('should distinguish weight/style variants', async () => {
      const manager = new FontManager(createMockProvider())
      await manager.loadFont('TestSans', '700')
      expect(manager.isLoaded('TestSans', '700')).toBe(true)
      expect(manager.isLoaded('TestSans', '400')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all cached fonts', async () => {
      const manager = new FontManager(createMockProvider())
      await manager.loadFont('TestSans')
      await manager.loadFont('TestSerif')
      expect(manager.isLoaded('TestSans')).toBe(true)

      manager.clear()

      expect(manager.isLoaded('TestSans')).toBe(false)
      expect(manager.isLoaded('TestSerif')).toBe(false)
    })
  })
})
