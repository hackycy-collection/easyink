export {
  extractCollectionPath,
  resolveBindingValue,
  resolveFieldFromRecord,
  resolveNodeBindings,
} from './binding-utils'
export { CommandManager, CompositeCommand, createBatchCommand } from './command'
export type { Command, HistoryEntry } from './command'
export {
  AddMaterialCommand,
  BindFieldCommand,
  BindStaticCellCommand,
  ClearBindingCommand,
  ClearStaticCellBindingCommand,
  getByPath,
  InsertTableColumnCommand,
  InsertTableRowCommand,
  MergeTableCellsCommand,
  MoveMaterialCommand,
  RemoveMaterialCommand,
  RemoveTableColumnCommand,
  RemoveTableRowCommand,
  ResizeMaterialCommand,
  ResizeTableColumnCommand,
  ResizeTableRowCommand,
  RotateMaterialCommand,
  setByPath,
  SplitTableCellCommand,
  UnionDropCommand,
  UpdateDocumentCommand,
  UpdateGeometryCommand,
  UpdateGuidesCommand,
  UpdateMaterialPropsCommand,
  UpdatePageCommand,
  UpdateTableCellBorderCommand,
  UpdateTableCellCommand,
  UpdateTableCellTypographyCommand,
  UpdateTableRowRoleCommand,
  UpdateTableVisibilityCommand,
  validateMerge,
} from './commands'

// ─── Editor Core（新内核，见 22-editor-core 架构文档） ───────────────
export * from './editor'

export { FontManager } from './font'
export type { FontDescriptor, FontProvider, FontSource } from './font'

export {
  distance,
  getBoundingRect,
  normalizeRotation,
  pointInRect,
  rectContains,
  rectsIntersect,
  snapToGrid,
  snapToGuide,
} from './geometry'

export type { Point, Rect, Size } from './geometry'

export { AsyncHook, createInternalHooks, SyncHook, SyncWaterfallHook } from './hooks'

export type { CommandRecord, InternalHooks, MaterialRenderPayload, PagePlanningContext, ViewerDiagnosticEvent } from './hooks'

export type {
  ContextAction,
  DatasourceDropHandler,
  DatasourceDropZone,
  DatasourceFieldInfo,
  MaterialDesignerExtension,
  MaterialExtensionContext,
  MaterialExtensionFactory,
  NodeSignal,
  PropertyPanelOverlay,
  PropertyPanelRequest,
  PropSchemaLike,
  SelectionSnapshot,
  ToolbarAction,
} from './material-extension'

export type {
  MaterialViewerExtension,
  ViewerMeasureContext,
  ViewerMeasureResult,
  ViewerRenderContext,
  ViewerRenderOutput,
} from './material-viewer'

export { createPagePlan } from './page-planner'
export type { PagePlan, PagePlanDiagnostic, PagePlanEntry } from './page-planner'

export { SelectionModel } from './selection'

export { UnitManager } from './unit'
