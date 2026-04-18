import type { DocumentSchema } from '@easyink/schema'
import type { EditorState, Plugin, PluginStateSpec, Step } from './types'

const HISTORY_META = 'history'
const HISTORY_GROUP_META = 'historyGroup'

interface HistoryEntry {
  /** 正向 step（用于 redo） */
  steps: readonly Step[]
  /** 反向 step（用于 undo） */
  inverted: readonly Step[]
  selectionBefore: Selection
  selectionAfter: Selection
  timestamp: number
  groupKey?: string
}

type Selection = EditorState['selection']

export interface HistoryState {
  done: readonly HistoryEntry[]
  undone: readonly HistoryEntry[]
}

export interface HistoryPluginOptions {
  /** 合并窗口（毫秒） */
  groupWindowMs?: number
  /** 最大保留的历史条数 */
  limit?: number
}

const DEFAULT_OPTIONS: Required<HistoryPluginOptions> = {
  groupWindowMs: 500,
  limit: 200,
}

function invertSteps(docBefore: DocumentSchema, steps: readonly Step[]): Step[] {
  // 逐步正向 apply，同时反向记录 invert，最后 reverse 得到"从最新状态回滚"顺序
  const inverts: Step[] = []
  let doc = docBefore
  for (const step of steps) {
    inverts.push(step.invert(doc))
    const res = step.apply(doc)
    if (res.failed || !res.doc)
      throw new Error(`[history] unable to replay for invert: ${res.failed}`)
    doc = res.doc
  }
  return inverts.reverse()
}

export function createHistoryPlugin(options: HistoryPluginOptions = {}): Plugin<HistoryState> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const stateSpec: PluginStateSpec<HistoryState> = {
    init: () => ({ done: [], undone: [] }),
    apply(tr, prev, oldState) {
      const historyMeta = tr.getMeta(HISTORY_META) as 'undo' | 'redo' | 'skip' | undefined
      if (historyMeta === 'skip' || tr.steps.length === 0) {
        // selection-only tr 默认不入栈；如有特殊需要可用 setMeta('history', 'record')
        if (tr.steps.length === 0)
          return prev
      }
      if (historyMeta === 'undo') {
        const last = prev.done.at(-1)
        if (!last)
          return prev
        return {
          done: prev.done.slice(0, -1),
          undone: [...prev.undone, last],
        }
      }
      if (historyMeta === 'redo') {
        const last = prev.undone.at(-1)
        if (!last)
          return prev
        return {
          done: [...prev.done, last],
          undone: prev.undone.slice(0, -1),
        }
      }
      // 普通记录
      const entry: HistoryEntry = {
        steps: tr.steps,
        inverted: invertSteps(tr.docBefore, tr.steps),
        selectionBefore: oldState.selection,
        selectionAfter: tr.selection,
        timestamp: Date.now(),
        groupKey: tr.getMeta(HISTORY_GROUP_META) as string | undefined,
      }
      const last = prev.done.at(-1)
      if (
        last
        && entry.groupKey
        && last.groupKey === entry.groupKey
        && entry.timestamp - last.timestamp < opts.groupWindowMs
      ) {
        // 合并：保留 last.selectionBefore、last.inverted 前缀（回滚到最早）、最新 selectionAfter
        const merged: HistoryEntry = {
          steps: [...last.steps, ...entry.steps],
          inverted: [...entry.inverted, ...last.inverted],
          selectionBefore: last.selectionBefore,
          selectionAfter: entry.selectionAfter,
          timestamp: entry.timestamp,
          groupKey: entry.groupKey,
        }
        return {
          done: [...prev.done.slice(0, -1), merged],
          undone: [],
        }
      }
      const nextDone = [...prev.done, entry]
      if (nextDone.length > opts.limit)
        nextDone.shift()
      return { done: nextDone, undone: [] }
    },
  }

  return {
    key: 'core/history',
    state: stateSpec,
    commands: {
      undo(state) {
        const history = state.getPluginState<HistoryState>('core/history')
        const entry = history?.done.at(-1)
        if (!entry)
          return null
        let tr = state.tr.setMeta(HISTORY_META, 'undo')
        for (const step of entry.inverted) tr = tr.step(step)
        tr = tr.setSelection(entry.selectionBefore)
        return tr
      },
      redo(state) {
        const history = state.getPluginState<HistoryState>('core/history')
        const entry = history?.undone.at(-1)
        if (!entry)
          return null
        let tr = state.tr.setMeta(HISTORY_META, 'redo')
        for (const step of entry.steps) tr = tr.step(step)
        tr = tr.setSelection(entry.selectionAfter)
        return tr
      },
    },
  }
}
