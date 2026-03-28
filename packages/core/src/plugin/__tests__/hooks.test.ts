import { describe, expect, it, vi } from 'vitest'
import { AsyncEvent, SyncBailHook, SyncWaterfallHook } from '../hooks'

describe('syncWaterfallHook', () => {
  it('should return the initial value when no taps', () => {
    const hook = new SyncWaterfallHook<[number]>()
    expect(hook.call(42)).toBe(42)
  })

  it('should pipe value through taps', () => {
    const hook = new SyncWaterfallHook<[number]>()
    hook.tap('add1', v => v + 1)
    hook.tap('double', v => v * 2)
    // (10 + 1) * 2 = 22
    expect(hook.call(10)).toBe(22)
  })

  it('should pass extra args to each tap', () => {
    const hook = new SyncWaterfallHook<[string, number]>()
    hook.tap('repeat', (str, times) => str.repeat(times))
    expect(hook.call('ab', 3)).toBe('ababab')
  })

  it('should chain waterfall with extra args', () => {
    const hook = new SyncWaterfallHook<[string, string]>()
    hook.tap('append', (str, suffix) => str + suffix)
    hook.tap('append2', (str, suffix) => str + suffix)
    expect(hook.call('x', '-y')).toBe('x-y-y')
  })

  it('untap should remove the named listener', () => {
    const hook = new SyncWaterfallHook<[number]>()
    hook.tap('add1', v => v + 1)
    hook.tap('add10', v => v + 10)
    hook.untap('add1')
    expect(hook.call(0)).toBe(10)
  })

  it('clear should remove all listeners', () => {
    const hook = new SyncWaterfallHook<[number]>()
    hook.tap('add1', v => v + 1)
    hook.tap('add10', v => v + 10)
    hook.clear()
    expect(hook.call(5)).toBe(5)
  })
})

describe('syncBailHook', () => {
  it('should return undefined when no taps', () => {
    const hook = new SyncBailHook<[string], boolean>()
    expect(hook.call('test')).toBeUndefined()
  })

  it('should return undefined when all taps return undefined', () => {
    const hook = new SyncBailHook<[string], boolean>()
    hook.tap('pass1', () => undefined)
    hook.tap('pass2', () => undefined)
    expect(hook.call('test')).toBeUndefined()
  })

  it('should bail on first non-undefined result', () => {
    const hook = new SyncBailHook<[number], string>()
    const spy = vi.fn(() => undefined as string | undefined)
    hook.tap('pass', () => undefined)
    hook.tap('bail', n => n > 5 ? 'too big' : undefined)
    hook.tap('never', spy)

    expect(hook.call(10)).toBe('too big')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should continue if bail condition not met', () => {
    const hook = new SyncBailHook<[number], string>()
    hook.tap('check', n => n > 100 ? 'too big' : undefined)
    hook.tap('fallback', () => undefined)
    expect(hook.call(5)).toBeUndefined()
  })

  it('untap should remove the named listener', () => {
    const hook = new SyncBailHook<[number], boolean>()
    hook.tap('block', () => true)
    hook.untap('block')
    expect(hook.call(1)).toBeUndefined()
  })

  it('clear should remove all listeners', () => {
    const hook = new SyncBailHook<[number], boolean>()
    hook.tap('block', () => true)
    hook.clear()
    expect(hook.call(1)).toBeUndefined()
  })
})

describe('asyncEvent', () => {
  it('should call all listeners on emit', () => {
    const event = new AsyncEvent<[string]>()
    const results: string[] = []
    event.on('a', (msg) => {
      results.push(`a:${msg}`)
    })
    event.on('b', (msg) => {
      results.push(`b:${msg}`)
    })
    event.emit('hello')
    expect(results).toEqual(['a:hello', 'b:hello'])
  })

  it('should not throw when a listener throws', () => {
    const event = new AsyncEvent<[number]>()
    event.on('bad', () => {
      throw new Error('boom')
    })
    event.on('good', () => {})
    expect(() => event.emit(1)).not.toThrow()
  })

  it('should not propagate errors from listeners', () => {
    const event = new AsyncEvent<[number]>()
    const results: number[] = []
    event.on('bad', () => {
      throw new Error('boom')
    })
    event.on('good', (n) => {
      results.push(n)
    })
    event.emit(42)
    expect(results).toEqual([42])
  })

  it('off should remove the named listener', () => {
    const event = new AsyncEvent<[string]>()
    const results: string[] = []
    event.on('a', (msg) => {
      results.push(msg)
    })
    event.off('a')
    event.emit('hello')
    expect(results).toEqual([])
  })

  it('clear should remove all listeners', () => {
    const event = new AsyncEvent<[string]>()
    const results: string[] = []
    event.on('a', (msg) => {
      results.push(msg)
    })
    event.on('b', (msg) => {
      results.push(msg)
    })
    event.clear()
    event.emit('hello')
    expect(results).toEqual([])
  })

  it('should handle zero-arg events', () => {
    const event = new AsyncEvent<[]>()
    let called = false
    event.on('init', () => {
      called = true
    })
    event.emit()
    expect(called).toBe(true)
  })
})
