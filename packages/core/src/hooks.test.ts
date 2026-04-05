import { describe, expect, it } from 'vitest'
import { AsyncHook, SyncHook, SyncWaterfallHook } from './hooks'

describe('syncHook', () => {
  it('tap and call', () => {
    const hook = new SyncHook<[string]>()
    const log: string[] = []
    hook.tap(msg => log.push(msg))
    hook.call('hello')
    expect(log).toEqual(['hello'])
  })

  it('calls multiple taps in order', () => {
    const hook = new SyncHook<[number]>()
    const log: number[] = []
    hook.tap(n => log.push(n * 1))
    hook.tap(n => log.push(n * 2))
    hook.call(5)
    expect(log).toEqual([5, 10])
  })

  it('untap removes callback', () => {
    const hook = new SyncHook<[string]>()
    const log: string[] = []
    const untap = hook.tap(msg => log.push(msg))
    untap()
    hook.call('hello')
    expect(log).toEqual([])
  })

  it('clear removes all callbacks', () => {
    const hook = new SyncHook<[string]>()
    const log: string[] = []
    hook.tap(msg => log.push(msg))
    hook.clear()
    hook.call('hello')
    expect(log).toEqual([])
  })
})

describe('syncWaterfallHook', () => {
  it('chains callbacks, each receiving previous result', () => {
    const hook = new SyncWaterfallHook<number>()
    hook.tap(v => v + 1)
    hook.tap(v => v * 2)
    expect(hook.call(5)).toBe(12) // (5+1)*2
  })

  it('returns initial value when no taps', () => {
    const hook = new SyncWaterfallHook<string>()
    expect(hook.call('unchanged')).toBe('unchanged')
  })

  it('clear removes all callbacks', () => {
    const hook = new SyncWaterfallHook<number>()
    hook.tap(v => v + 100)
    hook.clear()
    expect(hook.call(1)).toBe(1)
  })
})

describe('asyncHook', () => {
  it('calls async callbacks in order', async () => {
    const hook = new AsyncHook<[string]>()
    const log: string[] = []
    hook.tap(async (msg) => {
      log.push(`first:${msg}`)
    })
    hook.tap(async (msg) => {
      log.push(`second:${msg}`)
    })
    await hook.call('go')
    expect(log).toEqual(['first:go', 'second:go'])
  })

  it('awaits each callback before the next', async () => {
    const hook = new AsyncHook<[]>()
    const log: number[] = []
    hook.tap(async () => {
      await new Promise<void>(r => setTimeout(r, 10))
      log.push(1)
    })
    hook.tap(async () => {
      log.push(2)
    })
    await hook.call()
    expect(log).toEqual([1, 2])
  })

  it('clear removes all callbacks', async () => {
    const hook = new AsyncHook<[]>()
    const log: number[] = []
    hook.tap(async () => {
      log.push(1)
    })
    hook.clear()
    await hook.call()
    expect(log).toEqual([])
  })
})
