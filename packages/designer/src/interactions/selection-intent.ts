import type { DesignerStore } from '../store/designer-store'

/**
 * SelectionIntent — single, declarative entry point for every canvas-driven
 * mutation of the top-level SelectionModel.
 *
 * Why this exists
 * ---------------
 * Before this collapse point the SelectionModel was being written by at least
 * four distinct sites (CanvasWorkspace click handler, useElementDrag pointer-
 * down, useMarqueeSelect, EditingSessionManager.enter), and each site had a
 * private interpretation of "what does this gesture mean". The result was the
 * exact bug class the audit calls out: a single physical gesture mutating the
 * model multiple times with different intents.
 *
 * Rule
 * ----
 * Canvas-layer interaction code (controller, drag, marquee, editing-session
 * lifecycle) MUST go through `applySelectionIntent`. It must NOT call
 * `store.selection.{select,add,toggle,clear,selectMultiple}` directly.
 *
 * Keyboard-shortcut and programmatic APIs (delete, paste, structure-tree
 * picker) are explicitly out of scope: they do not race with pointer gesture
 * interpretation and can mutate the model directly.
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
    case 'single':
      store.selection.select(intent.elementId)
      return
    case 'add':
      store.selection.add(intent.elementId)
      return
    case 'toggle':
      store.selection.toggle(intent.elementId)
      return
    case 'replace':
      if (intent.elementIds.length === 0)
        store.selection.clear()
      else
        store.selection.selectMultiple(intent.elementIds)
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
      if (!store.selection.has(intent.elementId))
        store.selection.select(intent.elementId)
  }
}
