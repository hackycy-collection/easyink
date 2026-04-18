// Public API for the Editor Core kernel.
// See `.github/architecture/22-editor-core.md` for the protocol contract.

export { collectDeepPanels, floatingToolbarPlugin, geometryPlugin, visibilityPlugin } from './builtin-plugins'
export {
  collectMaterialPlugins,
  createMaterialNode,
  defineMaterial,
  findMaterial,
} from './define-material'
export type { DefineMaterialConfig, MaterialExtension } from './define-material'
export {
  getByPath as getNodeFieldByPath,
  patchNode,
  setByPathImmutable,
  snapshotJson,
  withElements,
} from './doc-utils'
export { createHistoryPlugin } from './history'
export type { HistoryPluginOptions, HistoryState } from './history'
export { createMapping, identityStepMap, nodeRemovedStepMap } from './mapping'
export type { ElementRangeSelection, ElementSelection, EmptySelection } from './selection'
export {
  deserializeSelection,
  elementRangeSelection,
  elementSelection,
  emptySelection,
  getSelectionTypeSpec,
  registerSelectionType,
} from './selection'
export type { EditorStateJSON } from './serialize'
export { deserializeEditorState, serializeEditorState } from './serialize'
export type { EditorStateConfig } from './state'
export { createEditorState, topoSortPlugins } from './state'
export { deserializeStep, getStepSpec, registerStepType } from './step'
export {
  InsertNodeStep,
  MoveNodeStep,
  PatchArrayStep,
  RemoveNodeStep,
  ReplaceNodeStep,
  SetPropStep,
} from './steps'
export type { PatchArrayOp } from './steps'
export { createTransaction } from './transaction'
export type {
  AnyPlugin,
  CommandFactory,
  DeepPanelContext,
  DeepPanelContribution,
  EditorState,
  KeymapHandler,
  Mapping,
  PanelContribution,
  Plugin,
  PluginStateSpec,
  PluginView,
  PropertyPanelContext,
  Selection,
  SelectionJSON,
  SelectionTypeSpec,
  Step,
  StepJSON,
  StepMap,
  StepResult,
  StepSpec,
  ToolbarContribution,
  ToolbarItem,
  Transaction,
  ViewContext,
  ViewLayers,
  ViewUtils,
} from './types'
export type { EditorView, EditorViewConfig } from './view'
export { createEditorView } from './view'
