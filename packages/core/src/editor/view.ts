import type { ComponentChildren } from 'preact'
import type {
  AnyVNode,
  EditorState,
  PluginView,
  Transaction,
  ViewContext,
  ViewLayers,
  ViewUtils,
} from './types'
import { Fragment, h, render } from 'preact'

export interface EditorView {
  readonly state: EditorState
  dispatch: (tr: Transaction) => void
  subscribe: (listener: (state: EditorState) => void) => () => void
  destroy: () => void
  /** 强制同步 reconcile（测试用）；常规路径走 rAF */
  flushSync: () => void
}

export interface EditorViewConfig {
  state: EditorState
  /** 宿主根节点（用于事件监听挂载，如 pointer/key 分发——v1 暂未启用） */
  mount: HTMLElement
  /** 画布内容层 preact render 目标 */
  canvasMount: HTMLElement
  /** 宿主提供的工具（t / unit / zoom 等） */
  utils?: Partial<ViewUtils>
}

const DEFAULT_UTILS: ViewUtils = {
  t: key => key,
  unit: 'mm',
  zoom: 1,
}

function emptyLayers(): ViewLayers {
  return { content: [], overlay: [], toolbar: [], handles: [] }
}

/**
 * 用 requestAnimationFrame 批量调度，SSR/测试环境回退到 microtask。
 */
function scheduler(run: () => void): { request: () => void, cancel: () => void } {
  const raf = typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : null
  const caf = typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function'
    ? globalThis.cancelAnimationFrame.bind(globalThis)
    : null
  let handle: number | null = null
  let mqueued = false
  return {
    request() {
      if (raf) {
        if (handle != null)
          return
        handle = raf(() => {
          handle = null
          run()
        })
      }
      else {
        if (mqueued)
          return
        mqueued = true
        queueMicrotask(() => {
          mqueued = false
          run()
        })
      }
    },
    cancel() {
      if (raf && caf && handle != null) {
        caf(handle)
        handle = null
      }
    },
  }
}

export function createEditorView(config: EditorViewConfig): EditorView {
  const utils: ViewUtils = { ...DEFAULT_UTILS, ...(config.utils ?? {}) }

  let current = config.state
  let destroyed = false
  const listeners = new Set<(state: EditorState) => void>()
  // forward-declared: sched 依赖 reconcile，dispatch 依赖 sched。
  let sched: { request: () => void, cancel: () => void }

  const dispatch = (tr: Transaction): void => {
    if (destroyed)
      return
    const next = current.apply(tr)
    if (next === current)
      return
    current = next
    for (const l of listeners)
      l(current)
    sched.request()
  }

  const reconcile = (): void => {
    if (destroyed)
      return
    const rootLayers = emptyLayers()
    const extras: AnyVNode[] = []

    for (const plugin of current.plugins) {
      const view = plugin.view as PluginView | undefined
      if (!view)
        continue
      const ctx: ViewContext = {
        state: current,
        pluginState: current.getPluginState(plugin.key),
        dispatch,
        layers: emptyLayers(),
        utils,
      }
      const produced = view.render(ctx)
      rootLayers.content.push(...ctx.layers.content)
      rootLayers.overlay.push(...ctx.layers.overlay)
      rootLayers.toolbar.push(...ctx.layers.toolbar)
      rootLayers.handles.push(...ctx.layers.handles)
      if (produced)
        extras.push(produced)
    }

    const tree = h(
      'div',
      { class: 'easyink-canvas-root', style: 'position:relative;width:100%;height:100%' },
      h('div', { class: 'easyink-layer easyink-layer-content' }, rootLayers.content as ComponentChildren),
      h('div', { class: 'easyink-layer easyink-layer-overlay' }, rootLayers.overlay as ComponentChildren),
      h('div', { class: 'easyink-layer easyink-layer-toolbar' }, rootLayers.toolbar as ComponentChildren),
      h('div', { class: 'easyink-layer easyink-layer-handles' }, rootLayers.handles as ComponentChildren),
      h(Fragment, null, extras as ComponentChildren),
    )
    render(tree, config.canvasMount)
  }

  sched = scheduler(reconcile)

  // 首次挂载：立即同步渲染一次
  reconcile()

  return {
    get state() {
      return current
    },
    dispatch,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      if (destroyed)
        return
      destroyed = true
      sched.cancel()
      listeners.clear()
      render(null, config.canvasMount)
    },
    flushSync() {
      sched.cancel()
      reconcile()
    },
  }
}
