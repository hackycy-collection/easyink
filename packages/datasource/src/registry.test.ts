import { describe, expect, it, vi } from 'vitest'
import { DataSourceRegistry } from './registry'

describe('dataSourceRegistry', () => {
  it('registers and retrieves a source by id', () => {
    const reg = new DataSourceRegistry()
    const source = { id: 's1', name: 'Source 1', fields: [] }
    reg.registerSource(source)
    expect(reg.getSourceSync('s1')).toBe(source)
  })

  it('returns undefined for unknown source', () => {
    const reg = new DataSourceRegistry()
    expect(reg.getSourceSync('unknown')).toBeUndefined()
  })

  it('finds source by tag', () => {
    const reg = new DataSourceRegistry()
    const source = { id: 's1', name: 'Source 1', tag: 'main', fields: [] }
    reg.registerSource(source)
    expect(reg.findSourceByTag('main')).toBe(source)
  })

  it('returns undefined when tag not found', () => {
    const reg = new DataSourceRegistry()
    expect(reg.findSourceByTag('none')).toBeUndefined()
  })

  it('getSources returns all registered sources', () => {
    const reg = new DataSourceRegistry()
    reg.registerSource({ id: 's1', name: 'A', fields: [] })
    reg.registerSource({ id: 's2', name: 'B', fields: [] })
    expect(reg.getSources()).toHaveLength(2)
  })

  it('unregisterSource removes a source', () => {
    const reg = new DataSourceRegistry()
    reg.registerSource({ id: 's1', name: 'A', fields: [] })
    reg.unregisterSource('s1')
    expect(reg.getSourceSync('s1')).toBeUndefined()
  })

  it('clear removes everything', () => {
    const reg = new DataSourceRegistry()
    reg.registerSource({ id: 's1', name: 'A', fields: [] })
    reg.clear()
    expect(reg.getSources()).toHaveLength(0)
  })

  it('resolves a provider factory on async access', async () => {
    const reg = new DataSourceRegistry()
    const source = { id: 'remote', name: 'Remote Source', fields: [] }

    reg.registerProviderFactory({
      id: 'remote',
      namespace: 'external',
      resolve: async () => source,
    })

    await expect(reg.getSource('remote')).resolves.toBe(source)
    expect(reg.getSourceSync('remote')).toBe(source)
  })

  it('continues notifying later listeners when an async callback rejects', async () => {
    const reg = new DataSourceRegistry()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const notified: string[] = []

    reg.onSourcesChange(async () => {
      notified.push('first')
      throw new Error('boom')
    })
    reg.onSourcesChange(() => {
      notified.push('second')
    })

    reg.registerSource({ id: 's1', name: 'A', fields: [] })
    await Promise.resolve()

    expect(notified).toEqual(['first', 'second'])
    expect(errorSpy).toHaveBeenCalledWith('Error in data source change callback:', expect.any(Error))

    errorSpy.mockRestore()
  })
})
