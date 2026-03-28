// ─── 钩子原语 ───

/**
 * Tap（监听器）注册项
 */
interface Tap<F> {
  name: string
  fn: F
}

/**
 * SyncWaterfallHook — 同步瀑布钩子
 *
 * 每个 tap 接收上一个 tap 的返回值作为第一个参数，
 * 最终结果返回给调用方。用于「修改」场景。
 */
export class SyncWaterfallHook<Args extends [any, ...any[]]> {
  private taps: Tap<(...args: Args) => Args[0]>[] = []

  tap(name: string, fn: (...args: Args) => Args[0]): void {
    this.taps.push({ name, fn })
  }

  call(...args: Args): Args[0] {
    let result = args[0]
    for (const { fn } of this.taps) {
      args[0] = result
      result = fn(...args)
    }
    return result
  }

  /** 移除指定名称的监听器 */
  untap(name: string): void {
    this.taps = this.taps.filter(t => t.name !== name)
  }

  /** 清空所有监听器 */
  clear(): void {
    this.taps = []
  }
}

/**
 * SyncBailHook — 同步熔断钩子
 *
 * 任一 tap 返回非 undefined 值时停止后续执行。
 * 用于「拦截/取消」场景。
 */
export class SyncBailHook<Args extends unknown[], R> {
  private taps: Tap<(...args: Args) => R | undefined>[] = []

  tap(name: string, fn: (...args: Args) => R | undefined): void {
    this.taps.push({ name, fn })
  }

  call(...args: Args): R | undefined {
    for (const { fn } of this.taps) {
      const result = fn(...args)
      if (result !== undefined)
        return result
    }
    return undefined
  }

  /** 移除指定名称的监听器 */
  untap(name: string): void {
    this.taps = this.taps.filter(t => t.name !== name)
  }

  /** 清空所有监听器 */
  clear(): void {
    this.taps = []
  }
}

/**
 * AsyncEvent — 异步通知事件
 *
 * 所有监听器并行执行，不影响核心流程。
 * 用于「监听/响应」场景。
 */
export class AsyncEvent<Args extends unknown[]> {
  private listeners: Tap<(...args: Args) => void | Promise<void>>[] = []

  on(name: string, fn: (...args: Args) => void | Promise<void>): void {
    this.listeners.push({ name, fn })
  }

  emit(...args: Args): void {
    for (const { fn } of this.listeners) {
      try {
        fn(...args)
      }
      catch {
        // 异步事件不阻塞核心流程，静默忽略错误
      }
    }
  }

  /** 移除指定名称的监听器 */
  off(name: string): void {
    this.listeners = this.listeners.filter(l => l.name !== name)
  }

  /** 清空所有监听器 */
  clear(): void {
    this.listeners = []
  }
}
