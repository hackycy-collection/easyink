/**
 * Editor-core ↔ Designer 桥。
 *
 * 目标：把 plugin.commands / plugin.propertyPanel / plugin.keymap / plugin.dropHandler
 * 这几个基于 EditorState 的回调嫁接到现有 Vue DesignerStore 上，
 * 在不引入真正的 EditorView/preact 运行时的前提下，以 Transaction/Step 协议完成 cell 级编辑。
 *
 * 见 .github/architecture/22-editor-core.md §22.7 / §22.11 / §22.12。
 */

import type {
  EditorState,
  MaterialExtension,
  Selection,
  Transaction,
} from '@easyink/core'
import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import { createTransaction, elementSelection, emptySelection } from '@easyink/core'

/**
 * 构造一个“够用于 plugin 回调”的 EditorState 伪对象。
 * 不走 createEditorState 是为了避免每次重建 plugin state slot 的开销，
 * 且我们不需要 plugin.state.apply 的累积能力。
 */
export function makeBridgeState(
  doc: DocumentSchema,
  selection: Selection,
  plugins: MaterialExtension['plugins'],
): EditorState {
  return {
    doc,
    selection,
    plugins,
    pluginStates: new Map(),
    get tr(): Transaction {
      return createTransaction(doc, selection)
    },
    apply(_tr: Transaction): EditorState {
      throw new Error('[editor-bridge] state.apply() is not supported in bridge mode; dispatch via DesignerStore.dispatchTransaction')
    },
    getPluginState<T>(_key: string): T | undefined {
      return undefined
    },
  }
}

/**
 * 把 Selection 转成 DesignerStore 认识的 { nodeId, row, col }（仅 table-cell 类型）。
 */
export function cellPathOf(selection: Selection): { nodeId: string, row: number, col: number } | null {
  if (selection.type !== 'table-cell' || !selection.nodeId)
    return null
  const [row, col] = (selection.path as readonly unknown[] | null) ?? []
  if (typeof row !== 'number' || typeof col !== 'number')
    return null
  return { nodeId: selection.nodeId, row, col }
}

/**
 * 默认选区：若 id 已知取 element 选区，否则空。
 */
export function defaultSelection(nodeId: string | null): Selection {
  return nodeId ? elementSelection(nodeId) : emptySelection()
}

/**
 * 从 doc 中定位某个 id 的节点并返回新 doc（替换 elements 中对应节点）。
 * 用于把 tr.doc 中局部变更同步回 DesignerStore 的 schema。
 */
export function replaceNodeInDoc(doc: DocumentSchema, node: MaterialNode): DocumentSchema {
  const idx = doc.elements.findIndex(e => e.id === node.id)
  if (idx < 0)
    return doc
  const elements = doc.elements.slice()
  elements[idx] = node
  return { ...doc, elements }
}
