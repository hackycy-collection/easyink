import type { DocumentSchema } from '@easyink/schema'
import type { AnyPlugin, EditorState } from './types'
import { deserializeSelection } from './selection'
import { createEditorState } from './state'

export interface EditorStateJSON {
  doc: DocumentSchema
  selection: ReturnType<EditorState['selection']['toJSON']>
  pluginStates: Record<string, unknown>
}

export function serializeEditorState(state: EditorState): EditorStateJSON {
  const pluginStates: Record<string, unknown> = {}
  for (const plugin of state.plugins) {
    if (!plugin.state)
      continue
    const value = state.getPluginState<unknown>(plugin.key)
    if (value === undefined)
      continue
    pluginStates[plugin.key] = plugin.state.toJSON
      ? plugin.state.toJSON(value as never)
      : value
  }
  return {
    doc: state.doc,
    selection: state.selection.toJSON(),
    pluginStates,
  }
}

export function deserializeEditorState(json: EditorStateJSON, plugins: AnyPlugin[]): EditorState {
  return createEditorState({
    doc: json.doc,
    selection: deserializeSelection(json.selection, json.doc),
    plugins,
    pluginStates: json.pluginStates,
  })
}
