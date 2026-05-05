import type { FontDescriptor, FontProvider } from './font'
import { describe, expect, it, vi } from 'vitest'
import { FontManager } from './font'

function createMockProvider(): FontProvider {
  const fonts: FontDescriptor[] = [
    { family: 'Arial', displayName: 'Arial', weights: ['400', '700'], styles: ['normal', 'italic'] },
    { family: 'Roboto', displayName: 'Roboto', weights: ['400'], styles: ['normal'] },
  ]
  return {
    listFonts: async () => fonts,
    loadFont: async (family: string) => `data:font/${family}`,
  }
}

describe('fontManager', () => {
  it('listFonts returns fonts from provider', async () => {
    const mgr = new FontManager(createMockProvider())
    const fonts = await mgr.listFonts()
    expect(fonts).toHaveLength(2)
    expect(fonts[0]!.family).toBe('Arial')
  })

  it('listFonts caches the result', async () => {
    let callCount = 0
    const provider: FontProvider = {
      listFonts: async () => {
        callCount++
        return [{ family: 'Test', displayName: 'Test', weights: ['400'], styles: ['normal'] }]
      },
      loadFont: async () => 'data',
    }
    const mgr = new FontManager(provider)
    await mgr.listFonts()
    await mgr.listFonts()
    expect(callCount).toBe(1)
  })

  it('listFonts returns empty array when no provider', async () => {
    const mgr = new FontManager()
    const fonts = await mgr.listFonts()
    expect(fonts).toEqual([])
  })

  it('loadFont returns font source', async () => {
    const mgr = new FontManager(createMockProvider())
    const source = await mgr.loadFont('Arial')
    expect(source).toBe('data:font/Arial')
  })

  it('loadFont caches the result', async () => {
    let callCount = 0
    const provider: FontProvider = {
      listFonts: async () => [],
      loadFont: async (family: string) => {
        callCount++
        return `data:${family}`
      },
    }
    const mgr = new FontManager(provider)
    await mgr.loadFont('Arial')
    await mgr.loadFont('Arial')
    expect(callCount).toBe(1)
  })

  it('loadFont reuses in-flight requests for the same font', async () => {
    let callCount = 0
    let resolveLoad: ((value: string) => void) | undefined
    const provider: FontProvider = {
      listFonts: async () => [],
      loadFont: () => {
        callCount++
        return new Promise((resolve) => {
          resolveLoad = resolve
        })
      },
    }
    const mgr = new FontManager(provider)

    const first = mgr.loadFont('Arial')
    const second = mgr.loadFont('Arial')

    expect(callCount).toBe(1)
    resolveLoad?.('data:Arial')

    await expect(Promise.all([first, second])).resolves.toEqual(['data:Arial', 'data:Arial'])
    expect(mgr.isLoaded('Arial')).toBe(true)
  })

  it('loadFont throws when no provider', async () => {
    const mgr = new FontManager()
    await expect(mgr.loadFont('Arial')).rejects.toThrow('No font provider configured')
  })

  it('isLoaded reflects cache state', async () => {
    const mgr = new FontManager(createMockProvider())
    expect(mgr.isLoaded('Arial')).toBe(false)
    await mgr.loadFont('Arial')
    expect(mgr.isLoaded('Arial')).toBe(true)
  })

  it('preloadFonts loads multiple families', async () => {
    const mgr = new FontManager(createMockProvider())
    const result = await mgr.preloadFonts(['Arial', 'Roboto'])
    expect(result.loadedFamilies).toEqual(['Arial', 'Roboto'])
    expect(result.failures).toEqual([])
    expect(mgr.isLoaded('Arial')).toBe(true)
    expect(mgr.isLoaded('Roboto')).toBe(true)
  })

  it('preloadFonts reports individual failures without aborting the batch', async () => {
    const provider: FontProvider = {
      listFonts: async () => [],
      loadFont: async (family: string) => {
        if (family === 'Bad')
          throw new Error('fail')
        return 'ok'
      },
    }
    const mgr = new FontManager(provider)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await mgr.preloadFonts(['Good', 'Bad'])

    expect(result.loadedFamilies).toEqual(['Good'])
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatchObject({
      family: 'Bad',
      message: 'fail',
    })
    expect(warn).toHaveBeenCalledWith('[easyink] font preload failed', expect.objectContaining({
      family: 'Bad',
      message: 'fail',
    }))
    warn.mockRestore()

    expect(mgr.isLoaded('Good')).toBe(true)
    expect(mgr.isLoaded('Bad')).toBe(false)
  })

  it('clear resets cache and font list', async () => {
    const mgr = new FontManager(createMockProvider())
    await mgr.listFonts()
    await mgr.loadFont('Arial')
    mgr.clear()
    expect(mgr.isLoaded('Arial')).toBe(false)
  })
})
