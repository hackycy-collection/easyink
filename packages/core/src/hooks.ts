/**
 * Lightweight synchronous hook system for internal extension points.
 * No external dependencies. Serves only internal use cases.
 */

type SyncHookCallback<T extends unknown[]> = (...args: T) => void
type SyncWaterfallCallback<T> = (value: T) => T
type AsyncHookCallback<T extends unknown[]> = (...args: T) => void | Promise<void>

export class SyncHook<T extends unknown[] = []> {
  private _callbacks: Array<SyncHookCallback<T>> = []

  tap(callback: SyncHookCallback<T>): () => void {
    this._callbacks.push(callback)
    return () => {
      const idx = this._callbacks.indexOf(callback)
      if (idx >= 0)
        this._callbacks.splice(idx, 1)
    }
  }

  call(...args: T): void {
    for (const cb of this._callbacks) {
      cb(...args)
    }
  }

  clear(): void {
    this._callbacks = []
  }
}

export class SyncWaterfallHook<T> {
  private _callbacks: Array<SyncWaterfallCallback<T>> = []

  tap(callback: SyncWaterfallCallback<T>): () => void {
    this._callbacks.push(callback)
    return () => {
      const idx = this._callbacks.indexOf(callback)
      if (idx >= 0)
        this._callbacks.splice(idx, 1)
    }
  }

  call(value: T): T {
    let result = value
    for (const cb of this._callbacks) {
      result = cb(result)
    }
    return result
  }

  clear(): void {
    this._callbacks = []
  }
}

export class AsyncHook<T extends unknown[] = []> {
  private _callbacks: Array<AsyncHookCallback<T>> = []

  tap(callback: AsyncHookCallback<T>): () => void {
    this._callbacks.push(callback)
    return () => {
      const idx = this._callbacks.indexOf(callback)
      if (idx >= 0)
        this._callbacks.splice(idx, 1)
    }
  }

  async call(...args: T): Promise<void> {
    for (const cb of this._callbacks) {
      await cb(...args)
    }
  }

  clear(): void {
    this._callbacks = []
  }
}
