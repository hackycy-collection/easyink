import type { DocumentSchema } from '@easyink/schema'
import type { VNode } from 'preact'

// ─── Selection ────────────────────────────────────────────────────

export interface Selection {
  readonly type: string
  readonly nodeId: string | null
  readonly path: readonly unknown[] | null
  toJSON: () => SelectionJSON
}

export interface SelectionJSON {
  type: string
  nodeId: string | null
  path: readonly unknown[] | null
  [extra: string]: unknown
}

export interface SelectionTypeSpec {
  type: string
  fromJSON: (json: SelectionJSON, doc: DocumentSchema) => Selection
}

// ─── Step / Mapping ───────────────────────────────────────────────

export interface StepResult {
  doc?: DocumentSchema
  failed?: string
}

export interface Step {
  readonly stepType: string
  apply: (doc: DocumentSchema) => StepResult
  invert: (doc: DocumentSchema) => Step
  getMap: () => StepMap
  toJSON: () => StepJSON
}

export interface StepJSON {
  stepType: string
  [k: string]: unknown
}

/**
 * StepMap: pure function transforming a selection from pre-step coords to post-step coords.
 * Returning null means the selection target was deleted (caller decides degradation policy).
 */
export interface StepMap {
  mapSelection: (sel: Selection) => Selection | null
}

export interface StepSpec {
  stepType: string
  fromJSON: (json: StepJSON, doc: DocumentSchema) => Step
}

export interface Mapping {
  readonly maps: readonly StepMap[]
  mapSelection: (sel: Selection) => Selection
  append: (map: StepMap) => Mapping
}

// ─── Transaction ──────────────────────────────────────────────────

export interface Transaction {
  readonly steps: readonly Step[]
  readonly docBefore: DocumentSchema
  readonly doc: DocumentSchema
  readonly selection: Selection
  readonly selectionSet: boolean
  readonly mapping: Mapping
  readonly meta: ReadonlyMap<string, unknown>

  step: (step: Step) => Transaction
  setSelection: (selection: Selection) => Transaction
  setMeta: (key: string, value: unknown) => Transaction
  getMeta: <T = unknown>(key: string) => T | undefined
  scrollIntoView: () => Transaction
}

// ─── Plugin ───────────────────────────────────────────────────────

/**
 * Plugin 的 state slot 是不透明的，Plugin 数组无法保留每个元素的具体类型参数。
 * 因此对外所有 plugin 集合统一用 AnyPlugin（`Plugin<any>`）表达，且 propertyPanel
 * 等回调内部再使用具体 T 类型。
 */

export type AnyPlugin = Plugin<any>

export interface Plugin<T = unknown> {
  readonly key: string
  readonly dependencies?: readonly string[]
  readonly state?: PluginStateSpec<T>
  readonly selectionTypes?: readonly SelectionTypeSpec[]
  readonly stepTypes?: readonly StepSpec[]
  readonly commands?: Record<string, CommandFactory>
  readonly view?: PluginView<T>
  readonly keymap?: Record<string, KeymapHandler>
  readonly propertyPanel?: (ctx: PropertyPanelContext<T>) => PanelContribution[]
  /**
   * 浮动工具栏贡献。被 `floatingToolbarPlugin` 聚合渲染。
   * 见 `.github/architecture/23-table-interaction.md` §23.5。
   */
  readonly toolbar?: ToolbarContribution
  /**
   * 深度选区面板贡献。由 designer 的 PropertiesPanel slot 渲染。
   * 见 `.github/architecture/23-table-interaction.md` §23.6。
   */
  readonly deepPanel?: DeepPanelContribution
  readonly dropHandler?: unknown
}

export interface PluginStateSpec<T> {
  init: (config: { doc: DocumentSchema, selection: Selection }) => T
  apply: (tr: Transaction, prev: T, oldState: EditorState, newState: EditorState) => T
  toJSON?: (value: T) => unknown
  fromJSON?: (json: unknown, doc: DocumentSchema) => T
}

// ─── Command ──────────────────────────────────────────────────────

export type CommandFactory = (
  state: EditorState,
  ...args: unknown[]
) => Transaction | null

// ─── EditorState (forward declaration to avoid cycles) ────────────

export interface EditorState {
  readonly doc: DocumentSchema
  readonly selection: Selection
  readonly plugins: readonly AnyPlugin[]
  readonly pluginStates: ReadonlyMap<string, unknown>
  readonly tr: Transaction
  apply: (tr: Transaction) => EditorState
  getPluginState: <T>(key: string) => T | undefined
}

// ─── Keymap & PropertyPanel (forward types) ───────────────────────

export type KeymapHandler = (
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  event: KeyboardEvent,
) => boolean

export interface PropertyPanelContext<T = unknown> {
  state: EditorState
  pluginState: T | undefined
  dispatch: (tr: Transaction) => void
  t: (key: string) => string
}

export interface PanelContribution {
  id: string
  order: number
  title?: string
  schemas: readonly unknown[]
  readValue: (key: string) => unknown
  writeValue: (key: string, value: unknown) => void
  binding?: unknown
  clearBinding?: (bindIndex?: number) => void
  editors?: Record<string, unknown>
}

// ─── View ─────────────────────────────────────────────────────────

// preact 的 VNode 默认参数是 `{}`，会对 `h('div', { class })` 返回的
// `VNode<{class:string}>` 产生逆变不兼容；layers 收集的是任意组件 VNode，这里用 any 放宽。
export type AnyVNode = VNode<any>

export interface ViewLayers {
  content: AnyVNode[]
  overlay: AnyVNode[]
  toolbar: AnyVNode[]
  handles: AnyVNode[]
}

export interface ViewUtils {
  t: (key: string) => string
  unit: string
  zoom: number
  getBindingLabel?: (ref: unknown) => string
}

export interface ViewContext<T = unknown> {
  state: EditorState
  pluginState: T | undefined
  dispatch: (tr: Transaction) => void
  layers: ViewLayers
  utils: ViewUtils
}

export interface PluginView<T = unknown> {
  /** 每帧 reconcile 调用一次；可返回 null（只往 layers 推内容）或额外的 VNode */
  render: (ctx: ViewContext<T>) => AnyVNode | null | void
}

// ─── Floating Toolbar / Deep Panel contributions ─────────────────

/**
 * 浮动工具栏单条按钮。见 `.github/architecture/23-table-interaction.md` §23.5。
 */
export interface ToolbarItem {
  id: string
  label?: string
  icon?: string
  /** 是否禁用（仍渲染为灰显）。返回 false 才禁用 */
  enabled?: (state: EditorState) => boolean
  run: (state: EditorState, dispatch: (tr: Transaction) => void) => void
}

/**
 * 浮动工具栏贡献。一个 plugin 至多贡献一条浮条。
 */
export interface ToolbarContribution {
  /** 该浮条所属物料 plugin key（决定堆叠顺序） */
  ownerKey: string
  /** 决定是否显示当前浮条 */
  visible: (state: EditorState) => boolean
  /** 浮条吸附目标 nodeId；返回 null 则吸附画布顶部 */
  anchorNodeId: (state: EditorState) => string | null
  /** 计算当前帧按钮列表 */
  items: (state: EditorState) => ToolbarItem[]
}

/**
 * 深度选区面板上下文（slot view 渲染参数）。
 */
export interface DeepPanelContext<T = unknown> {
  state: EditorState
  pluginState: T | undefined
  dispatch: (tr: Transaction) => void
  t: (key: string) => string
}

/**
 * 深度选区面板贡献。由 designer PropertiesPanel slot 调用。
 * `view` 返回 preact VNode；designer 只负责把它挂在 panel 顶部。
 */
export interface DeepPanelContribution<T = unknown> {
  ownerKey: string
  visible: (state: EditorState) => boolean
  view: (ctx: DeepPanelContext<T>) => AnyVNode | null
}
