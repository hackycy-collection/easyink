import type { DesignerStore } from '../store/designer-store'
import type { GestureContext } from './gesture-context'
import { isInteractable, UnitManager } from '@easyink/core'
import { ref } from 'vue'
import { useElementDrag } from '../composables/use-element-drag'
import { createGestureContext } from './gesture-context'
import { applySelectionIntent } from './selection-intent'

export interface CanvasInteractionControllerContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
  getScrollEl: () => HTMLElement | null
  /**
   * Optional hook fired after a marquee/empty-canvas pointerdown so the
   * caller can wire its existing useMarqueeSelect executor into the same
   * gesture pipeline. The controller intentionally does NOT own the marquee
   * executor itself: marquee semantics (rubber-band rectangle, additive
   * mode) live in the executor and are stable.
   */
  onCanvasBackgroundPointerDown?: (e: PointerEvent) => void
}

/**
 * CanvasInteractionController \u2014 the single decision point that translates
 * raw pointer / click events on the canvas into explicit intents.
 *
 * Responsibilities (and only these):
 * 1. Open a GestureContext on every pointerdown.
 * 2. Decide which SelectionIntent to apply, whether to enter an editing
 *    session, and whether to delegate to the drag executor.
 * 3. Read the GestureContext on click to decide whether to ignore (drag
 *    happened, edit was just entered, modifier-add already applied), or to
 *    apply a follow-up SelectionIntent.
 *
 * Things this controller deliberately does NOT do:
 * - Marquee math (lives in useMarqueeSelect, called via the background hook).
 * - Drag math / snap / undo grouping (lives in useElementDrag).
 * - Editing-session lifecycle (delegated to store.editingSession).
 *
 * Why the central decision point:
 * Before this collapse, the "interpretation" of one gesture was distributed
 * across CanvasWorkspace.vue, useElementDrag, useMarqueeSelect and
 * EditingSessionManager.enter. Each of them maintained a private flag (or
 * silently mutated SelectionModel). Bugs of the form "Cmd+click added then
 * the click toggled it off" or "click-trigger material entered editing twice"
 * trace back to that distribution. Centralising the decision \u2014 plus enforcing
 * `applySelectionIntent` as the only canvas-side write path \u2014 eliminates the
 * class.
 */
export function useCanvasInteractionController(ctx: CanvasInteractionControllerContext) {
  const { store } = ctx

  const currentGesture = ref<GestureContext | null>(null)

  const drag = useElementDrag({
    store,
    getPageEl: ctx.getPageEl,
    getScrollEl: ctx.getScrollEl,
    onDragMoved: () => {
      const g = currentGesture.value
      if (g)
        g.dragMoved = true
    },
  })

  function pointToDocument(e: { clientX: number, clientY: number }): { x: number, y: number } | null {
    const pageEl = ctx.getPageEl()
    if (!pageEl)
      return null
    const rect = pageEl.getBoundingClientRect()
    const zoom = store.workbench.viewport.zoom
    const um = new UnitManager(store.schema.unit)
    return {
      x: um.screenToDocument(e.clientX, rect.left, 0, zoom),
      y: um.screenToDocument(e.clientY, rect.top, 0, zoom),
    }
  }

  function handleElementPointerDown(e: PointerEvent, elementId: string) {
    e.stopPropagation()

    const gesture = createGestureContext(elementId, e)
    currentGesture.value = gesture

    // Right-click: keep the existing selection intact (or collapse to this
    // element if it was not selected). Skip drag and editing entirely so the
    // context menu opens against a stable selection.
    if (gesture.rightButton) {
      applySelectionIntent(store, { kind: 'preserve-for-context-menu', elementId })
      return
    }

    const activeNodeId = store.editingSession.activeNodeId

    // Inside an active editing session for this same node: route the pointer
    // event into the session, do not touch top-level selection.
    if (store.editingSession.isActive && activeNodeId === elementId) {
      const point = pointToDocument(e)
      if (point) {
        store.editingSession.dispatch({ kind: 'pointer-down', point, originalEvent: e })
      }
      return
    }

    // Editing another element: exit before reinterpreting this gesture so the
    // session lifecycle is independent of selection mutation order.
    if (store.editingSession.isActive && activeNodeId !== elementId) {
      store.editingSession.exit()
    }

    // Enter editing-session for click-trigger materials when no modifier is
    // held. Modifier+click is reserved for multi-select \u2014 it must not enter
    // editing (would be a cross-purpose gesture).
    if (!gesture.modifier) {
      const node = store.getElementById(elementId)
      const ext = node ? store.getDesignerExtension(node.type) : undefined
      if (ext?.geometry && ext.enterTrigger === 'click') {
        const initialPoint = pointToDocument(e)
        if (initialPoint && store.editingSession.enter(elementId, ext, initialPoint)) {
          gesture.editEntered = true
          return
        }
      }
    }

    // Decide top-level selection BEFORE handing off to the drag executor.
    // Drag is now a pure executor that reads `store.selection` to know what
    // to move; it does not write to the model.
    const node = store.getElementById(elementId)
    if (!node || !isInteractable(node))
      return

    if (!store.selection.has(elementId)) {
      if (gesture.modifier) {
        applySelectionIntent(store, { kind: 'add', elementId })
        gesture.selectionAddedViaPrime = true
      }
      else {
        applySelectionIntent(store, { kind: 'single', elementId })
      }
    }

    drag.onPointerDown(e, elementId)
  }

  function handleElementClick(e: MouseEvent, elementId: string) {
    e.stopPropagation()

    const gesture = currentGesture.value

    // No matching gesture: synthesised click without a paired pointerdown
    // (rare \u2014 e.g. keyboard-driven activation). Fall through to the default
    // single-select path.
    if (!gesture || gesture.targetElementId !== elementId) {
      applySelectionIntent(store, { kind: 'single', elementId })
      return
    }

    // Order matters: each early-exit corresponds to a pointerdown decision
    // that already wrote what was needed. This is what the GestureContext
    // exists for \u2014 click does not have to re-derive intent from scratch.
    if (gesture.dragMoved)
      return
    if (gesture.editEntered)
      return
    if (gesture.selectionAddedViaPrime)
      return
    if (gesture.rightButton)
      return

    if (gesture.modifier) {
      applySelectionIntent(store, { kind: 'toggle', elementId })
      return
    }

    if (!store.selection.has(elementId) || store.selection.count > 1)
      applySelectionIntent(store, { kind: 'single', elementId })
  }

  function handleElementDblClick(e: MouseEvent, elementId: string) {
    e.stopPropagation()

    if (store.editingSession.isActive && store.editingSession.activeNodeId === elementId) {
      store.editingSession.dispatch({ kind: 'command', command: 'enter-edit' })
      return
    }

    const node = store.getElementById(elementId)
    const ext = node ? store.getDesignerExtension(node.type) : undefined
    if (ext?.geometry && (ext.enterTrigger ?? 'dblclick') === 'dblclick') {
      const initialPoint = pointToDocument(e)
      if (!initialPoint)
        return
      const session = store.editingSession.enter(elementId, ext, initialPoint)
      if (session && session.selectionStore.selection)
        store.editingSession.dispatch({ kind: 'command', command: 'enter-edit' })
    }
  }

  function handleScrollPointerDown(e: PointerEvent) {
    const pageEl = ctx.getPageEl()
    const scrollEl = ctx.getScrollEl()
    // Only accept the gesture on actual canvas background (not on overlay
    // children). The empty-space contract is shared with marquee.
    if (e.target !== scrollEl && e.target !== pageEl)
      return

    currentGesture.value = createGestureContext(null, e)

    if (store.editingSession.isActive)
      store.editingSession.exit()

    ctx.onCanvasBackgroundPointerDown?.(e)
  }

  /**
   * Exposed for DeepEditDragHandle: it shares the same drag executor
   * instance as the main canvas, eliminating the prior duplicate `useElementDrag`
   * call site that owned its own private `dragJustOccurred` ref.
   */
  function handleDeepEditHandlePointerDown(e: PointerEvent, elementId: string) {
    e.stopPropagation()
    const gesture = createGestureContext(elementId, e)
    currentGesture.value = gesture
    // The deep-edit handle is only visible when the element is already the
    // single selection / session owner; no selection mutation is needed.
    drag.onPointerDown(e, elementId)
  }

  return {
    handleElementPointerDown,
    handleElementClick,
    handleElementDblClick,
    handleScrollPointerDown,
    handleDeepEditHandlePointerDown,
    /** Exposed only for tests / debug. Production code MUST NOT read this. */
    _currentGesture: currentGesture,
  }
}
