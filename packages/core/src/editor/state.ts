import type { DocumentSchema } from '@easyink/schema'
import type { AnyPlugin, EditorState, Selection, Transaction } from './types'
import { emptySelection, registerSelectionType } from './selection'
import { createTransaction } from './transaction'

export interface EditorStateConfig {
  doc: DocumentSchema
  selection?: Selection
  plugins: AnyPlugin[]
  /** 预注入的 plugin states（用于反序列化）；未命中的 plugin 走 init */
  pluginStates?: ReadonlyMap<string, unknown> | Record<string, unknown>
}

export function createEditorState(config: EditorStateConfig): EditorState {
  const plugins = topoSortPlugins(config.plugins)
  for (const plugin of plugins)
    plugin.selectionTypes?.forEach(spec => registerSelectionType(spec))
  const selection = config.selection ?? emptySelection()
  const pluginStates = new Map<string, unknown>()
  const injected = config.pluginStates instanceof Map
    ? config.pluginStates
    : config.pluginStates
      ? new Map(Object.entries(config.pluginStates))
      : undefined
  for (const plugin of plugins) {
    if (!plugin.state)
      continue
    if (injected?.has(plugin.key)) {
      const raw = injected.get(plugin.key)
      const value = plugin.state.fromJSON
        ? plugin.state.fromJSON(raw, config.doc)
        : raw
      pluginStates.set(plugin.key, value)
    }
    else {
      pluginStates.set(plugin.key, plugin.state.init({ doc: config.doc, selection }))
    }
  }
  return buildState({
    doc: config.doc,
    selection,
    plugins,
    pluginStates,
  })
}

interface StateInternal {
  doc: DocumentSchema
  selection: Selection
  plugins: readonly AnyPlugin[]
  pluginStates: ReadonlyMap<string, unknown>
}

function buildState(internal: StateInternal): EditorState {
  const state: EditorState = {
    get doc() { return internal.doc },
    get selection() { return internal.selection },
    get plugins() { return internal.plugins },
    get pluginStates() { return internal.pluginStates },
    get tr(): Transaction {
      return createTransaction(internal.doc, internal.selection)
    },
    apply(tr: Transaction): EditorState {
      const nextPluginStates = new Map(internal.pluginStates)
      const oldState = state
      const newInternal: StateInternal = {
        doc: tr.doc,
        selection: tr.selection,
        plugins: internal.plugins,
        pluginStates: nextPluginStates,
      }
      const newState = buildState(newInternal)
      for (const plugin of internal.plugins) {
        if (!plugin.state)
          continue
        const prev = internal.pluginStates.get(plugin.key) as never
        const next = plugin.state.apply(tr, prev, oldState, newState)
        nextPluginStates.set(plugin.key, next)
      }
      return newState
    },
    getPluginState<T>(key: string): T | undefined {
      return internal.pluginStates.get(key) as T | undefined
    },
  }
  return state
}

// ─── Topological sort ─────────────────────────────────────────────

export function topoSortPlugins(plugins: AnyPlugin[]): AnyPlugin[] {
  const byKey = new Map<string, AnyPlugin>()
  for (const p of plugins) {
    if (byKey.has(p.key))
      throw new Error(`[editor] duplicate plugin key: ${p.key}`)
    byKey.set(p.key, p)
  }
  const result: AnyPlugin[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(p: AnyPlugin, stack: readonly string[]): void {
    if (visited.has(p.key))
      return
    if (visiting.has(p.key))
      throw new Error(`[editor] plugin cycle: ${[...stack, p.key].join(' -> ')}`)
    visiting.add(p.key)
    for (const dep of p.dependencies ?? []) {
      const depPlugin = byKey.get(dep)
      if (!depPlugin)
        throw new Error(`[editor] plugin ${p.key} missing dependency ${dep}`)
      visit(depPlugin, [...stack, p.key])
    }
    visiting.delete(p.key)
    visited.add(p.key)
    result.push(p)
  }
  for (const p of plugins) visit(p, [])
  return result
}
