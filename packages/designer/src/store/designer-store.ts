import type { MaterialExtension, Step, Transaction } from '@easyink/core'
import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { LocaleMessages, MaterialCatalogEntry, MaterialDefinition, MaterialDesignerExtension, MaterialExtensionFactory, PreferenceProvider, PropertyPanelOverlay } from '../types'
import { CommandManager, SelectionModel } from '@easyink/core'
import { DataSourceRegistry } from '@easyink/datasource'
import { createDefaultSchema } from '@easyink/schema'
import { markRaw } from 'vue'
import { createMaterialExtensionContext } from '../materials/extension-context'
import { applyPersistedWorkbench, loadWorkbenchPreferences } from './preference-persistence'
import { createDefaultSaveBranchMenu, createDefaultWorkbenchState } from './workbench'

/** 子选区（当前只支持 table cell，后续可扩展 container slot 等）。 */
export interface CellSelectionState {
  nodeId: string
  row: number
  col: number
}

/**
 * DesignerStore is the central state manager for the designer.
 * It composes template state, workbench state, and interaction context.
 */
export class DesignerStore {
  // ─── Template state (enters Schema + command history) ─────────
  private _schema: DocumentSchema

  // ─── Core services ────────────────────────────────────────────
  readonly commands = new CommandManager()
  readonly selection = new SelectionModel()
  readonly dataSourceRegistry = new DataSourceRegistry()

  // ─── Clipboard (internal, not in Schema) ──────────────────────
  clipboard: MaterialNode[] = []

  // ─── Workbench state (NOT in Schema, NOT in undo/redo) ───────
  readonly workbench = createDefaultWorkbenchState()
  readonly saveBranch = createDefaultSaveBranchMenu()

  // ─── Material registry ────────────────────────────────────────
  private _materials = new Map<string, MaterialDefinition>()
  private _materialFactories = new Map<string, MaterialExtensionFactory>()
  private _cachedExtensions = new Map<string, MaterialDesignerExtension>()
  /** 新式 plugin 协议扩展；当前仅表格已迁移，其它物料走 _cachedExtensions。 */
  private _materialExtensions = new Map<string, MaterialExtension>()
  private _catalog: MaterialCatalogEntry[] = []

  // ─── Property panel overlay (pushed by materials) ────────────
  private _propertyOverlay: PropertyPanelOverlay | null = null

  // ─── Sub-element (cell) selection ────────────────────────────
  /** 仅用于 cell 级深度编辑；element 级选区仍走 `selection`。 */
  cellSelection: CellSelectionState | null = null

  // ─── Page element provider (for coordinate conversion) ──────
  private _pageElProvider: () => HTMLElement | null = () => null

  // ─── Locale ───────────────────────────────────────────────────
  private _locale?: LocaleMessages

  constructor(schema?: DocumentSchema, preferenceProvider?: PreferenceProvider) {
    this._schema = schema || createDefaultSchema()
    markRaw(this._materials)
    markRaw(this._materialFactories)
    markRaw(this._cachedExtensions)
    markRaw(this._materialExtensions)
    markRaw(this.dataSourceRegistry)

    // Apply persisted workbench state if available
    if (preferenceProvider) {
      const persisted = loadWorkbenchPreferences(preferenceProvider)
      if (persisted) {
        applyPersistedWorkbench(this.workbench, persisted)
      }
    }
  }

  // ─── Schema access ────────────────────────────────────────────

  get schema(): DocumentSchema {
    return this._schema
  }

  setSchema(schema: DocumentSchema): void {
    this._schema = schema
    this.selection.clear()
    this.commands.clear()
    this._propertyOverlay = null
    this.cellSelection = null
  }

  // ─── Element operations ───────────────────────────────────────

  getElements(): MaterialNode[] {
    return this._schema.elements
  }

  getElementById(id: string): MaterialNode | undefined {
    return this._schema.elements.find(el => el.id === id)
  }

  addElement(node: MaterialNode): void {
    this._schema.elements.push(node)
  }

  removeElement(id: string): MaterialNode | undefined {
    const idx = this._schema.elements.findIndex(el => el.id === id)
    if (idx < 0)
      return undefined
    const [removed] = this._schema.elements.splice(idx, 1)
    this.selection.remove(id)
    return removed
  }

  updateElement(id: string, updates: Partial<MaterialNode>): void {
    const el = this.getElementById(id)
    if (!el)
      return
    Object.assign(el, updates)
  }

  // ─── Material registry ────────────────────────────────────────

  registerMaterial(definition: MaterialDefinition): void {
    this._materials.set(definition.type, definition)
  }

  getMaterial(type: string): MaterialDefinition | undefined {
    return this._materials.get(type)
  }

  registerCatalogEntry(entry: MaterialCatalogEntry): void {
    this._catalog.push(entry)
  }

  getCatalog(): MaterialCatalogEntry[] {
    return this._catalog
  }

  getQuickMaterials(): MaterialCatalogEntry[] {
    return this._catalog.filter(e => e.priority === 'quick')
  }

  getGroupedMaterials(group: string): MaterialCatalogEntry[] {
    return this._catalog.filter(e => e.group === group && e.priority !== 'quick')
  }

  // ─── Extension Factory Registry ─────────────────────────────────

  registerDesignerFactory(type: string, factory: MaterialExtensionFactory): void {
    this._materialFactories.set(type, factory)
  }

  /** Get or lazily instantiate an extension from its factory. */
  getDesignerExtension(type: string): MaterialDesignerExtension | undefined {
    let ext = this._cachedExtensions.get(type)
    if (ext)
      return ext

    const factory = this._materialFactories.get(type)
    if (!factory)
      return undefined

    const context = createMaterialExtensionContext(this)
    ext = factory(context)
    this._cachedExtensions.set(type, ext)
    return ext
  }

  // ─── New-style MaterialExtension (plugin protocol) ────────────

  /** Register a new-style `MaterialExtension` (plugins + defineMaterial). */
  registerMaterialExtension(ext: MaterialExtension): void {
    this._materialExtensions.set(ext.type, ext)
  }

  /** Get a new-style `MaterialExtension` by material type. */
  getMaterialExtension(type: string): MaterialExtension | undefined {
    return this._materialExtensions.get(type)
  }

  // ─── Cell selection ───────────────────────────────────────────

  /** Enter deep-edit mode on a specific table cell. */
  enterCellEdit(nodeId: string, row: number, col: number): void {
    this.cellSelection = { nodeId, row, col }
    // Keep element selection so the canvas outline stays visible.
    this.selection.select(nodeId)
  }

  /** Exit cell-edit mode (but keep element selection). */
  exitCellEdit(): void {
    this.cellSelection = null
  }

  // ─── Transaction dispatch ─────────────────────────────────────

  /**
   * Apply a Transaction's steps to the schema and record an undo entry.
   *
   * v1 bridge: does NOT go through EditorState.apply; instead it pipes each
   * step through step.apply/step.invert directly and swaps `_schema` atomically.
   * This preserves Vue reactivity and CommandManager-based history while we
   * transition to a real EditorView in a later milestone.
   */
  dispatchTransaction(tr: Transaction, description: string): void {
    const steps = tr.steps
    if (steps.length === 0) {
      // Selection-only transaction; sync cellSelection then bail out.
      this.syncCellSelectionFromTx(tr)
      return
    }

    const forwardSteps = steps.slice()
    // Pre-compute inverse chain (in reverse order for undo).
    const inverseSteps: Step[] = []
    let cursor: DocumentSchema = this._schema
    for (const step of forwardSteps) {
      inverseSteps.unshift(step.invert(cursor))
      const result = step.apply(cursor)
      if (result.failed) {
        console.error('[designer-store] step failed:', result.failed, step)
        return
      }
      cursor = result.doc ?? cursor
    }

    const docAfter = cursor
    const docBefore = this._schema

    const nextSelection = tr.selectionSet ? tr.selection : null

    const applyForward = (): void => {
      this._schema = docAfter
      if (nextSelection)
        this.syncCellSelectionFromSelection(nextSelection)
    }

    const applyInverse = (): void => {
      this._schema = docBefore
      // Restore selection prior to tx.
      // For v1 bridge we just drop cellSelection on undo; element selection is kept.
      this.cellSelection = null
    }

    this.commands.execute({
      id: `${description}:${Date.now()}`,
      type: 'step',
      description,
      execute: applyForward,
      undo: applyInverse,
    })
  }

  private syncCellSelectionFromTx(tr: Transaction): void {
    if (!tr.selectionSet)
      return
    this.syncCellSelectionFromSelection(tr.selection)
  }

  private syncCellSelectionFromSelection(sel: { type: string, nodeId: string | null, path: readonly unknown[] | null }): void {
    if (sel.type === 'table-cell' && sel.nodeId && Array.isArray(sel.path)) {
      const [row, col] = sel.path as readonly unknown[]
      if (typeof row === 'number' && typeof col === 'number') {
        this.cellSelection = { nodeId: sel.nodeId, row, col }
        return
      }
    }
    if (sel.type === 'empty' || sel.type === 'element')
      this.cellSelection = null
  }

  // ─── Locale ───────────────────────────────────────────────────

  setLocale(locale: LocaleMessages): void {
    this._locale = locale
  }

  t(key: string): string {
    if (!this._locale)
      return key
    const parts = key.split('.')
    let current: unknown = this._locale
    for (const part of parts) {
      if (typeof current !== 'object' || current === null)
        return key
      current = (current as Record<string, unknown>)[part]
    }
    return typeof current === 'string' ? current : key
  }

  // ─── Visual geometry ─────────────────────────────────────────────

  /** Visual height in the designer, accounting for virtual content (e.g. placeholder rows). Falls back to node.height. */
  getVisualHeight(node: MaterialNode): number {
    const ext = this.getDesignerExtension(node.type)
    return ext?.getVisualHeight?.(node) ?? node.height
  }

  // ─── Page element provider ───────────────────────────────────────

  /** Register the page DOM element provider (called by CanvasWorkspace on mount). */
  setPageElProvider(provider: () => HTMLElement | null): void {
    this._pageElProvider = provider
  }

  /** Get the page DOM element for coordinate conversion. */
  getPageEl(): HTMLElement | null {
    return this._pageElProvider()
  }

  // ─── Property Panel Overlay ──────────────────────────────────

  /** Set or clear the property panel overlay (called by material extensions). */
  setPropertyOverlay(overlay: PropertyPanelOverlay | null): void {
    this._propertyOverlay = overlay
  }

  /** Current active overlay pushed by a material extension. */
  get propertyOverlay(): PropertyPanelOverlay | null {
    return this._propertyOverlay
  }

  // ─── Cleanup ──────────────────────────────────────────────────

  destroy(): void {
    this.commands.clear()
    this.selection.clear()
    this.dataSourceRegistry.clear()
    this._materials.clear()
    this._materialFactories.clear()
    this._cachedExtensions.clear()
    this._materialExtensions.clear()
    this._catalog = []
    this.clipboard = []
    this._propertyOverlay = null
    this.cellSelection = null
  }
}
