import type { DesignerStore } from '../store/designer-store'
import { expandElementIdsForGroups } from './logical-groups'

/**
 * SelectionIntent — declarative entry point for **canvas pointer gesture**
 * mutations of the top-level SelectionModel.
 *
 * Scope rule (audit/202605011431.md item 5)
 * -----------------------------------------
 * - Canvas pointer interpretation (controller, drag, marquee, editing-
 *   session lifecycle): MUST go through `applySelectionIntent`.
 * - Non-canvas surfaces (TopBar buttons, CanvasContextMenu actions,
 *   keyboard shortcuts, structure-tree picker, MaterialPanel, datasource
 *   drop, paste/duplicate): use the named wrappers in `selection-api.ts`
 *   instead. They keep the exception list explicit and auditable.
 * - Direct `store.selection.{select,add,toggle,clear,selectMultiple}`:
 *   forbidden everywhere (PR-blocking).
 *
 * Why two surfaces instead of one
 * -------------------------------
 * The canvas-pointer enum is intentionally narrow: every kind maps to a
 * single physical gesture outcome. Forcing TopBar/keyboard/etc. through
 * the same enum either pollutes it with pointer-irrelevant kinds or hides
 * the call site behind a misleading name. Splitting the surfaces lets
 * each one keep a tight, self-explanatory API while still routing every
 * write through a documented entry point.
 */
export type SelectionIntent
  = | { kind: 'single', elementId: string }
    | { kind: 'add', elementId: string }
    | { kind: 'toggle', elementId: string }
    | { kind: 'replace', elementIds: string[] }
    | { kind: 'collapse-to-session-owner', elementId: string }
    | { kind: 'clear' }
  /**
   * Right-click semantics: the user opened a context menu on an element.
   * If the element is already part of the current selection, do nothing
   * (preserve the multi-selection so "delete selected" works as expected).
   * Otherwise collapse to a single selection of this element.
   */
    | { kind: 'preserve-for-context-menu', elementId: string }

export function applySelectionIntent(store: DesignerStore, intent: SelectionIntent): void {
  switch (intent.kind) {
    case 'single': {
      const ids = expandElementIdsForGroups(store, [intent.elementId])
      if (ids.length === 0)
        store.selection.clear()
      else
        store.selection.selectMultiple(ids)
      return
    }
    case 'add':
      for (const id of expandElementIdsForGroups(store, [intent.elementId]))
        store.selection.add(id)
      return
    case 'toggle': {
      const ids = expandElementIdsForGroups(store, [intent.elementId])
      const shouldRemove = ids.length > 0 && ids.every(id => store.selection.has(id))
      for (const id of ids) {
        if (shouldRemove)
          store.selection.remove(id)
        else
          store.selection.add(id)
      }
      return
    }
    case 'replace':
      if (intent.elementIds.length === 0) {
        store.selection.clear()
      }
      else {
        const ids = expandElementIdsForGroups(store, intent.elementIds)
        if (ids.length === 0)
          store.selection.clear()
        else
          store.selection.selectMultiple(ids)
      }
      return
    case 'collapse-to-session-owner':
      // Editing-session and multi-selection are mutually exclusive (see
      // 22-editing-behavior.md §22.0). Collapsing through this intent makes
      // the rule a single line of code instead of a comment scattered across
      // four call sites.
      store.selection.selectMultiple([intent.elementId])
      return
    case 'clear':
      store.selection.clear()
      return
    case 'preserve-for-context-menu':
      if (!store.selection.has(intent.elementId)) {
        const ids = expandElementIdsForGroups(store, [intent.elementId])
        if (ids.length === 0)
          store.selection.clear()
        else
          store.selection.selectMultiple(ids)
      }
  }
}
