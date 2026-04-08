import type { DesignerStore } from '../store/designer-store'
import type { DeepEditingDefinition, DeepEditingPhase, MaterialDesignerExtension } from '../types'

export interface DeepEditingContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
  getScrollEl: () => HTMLElement | null
  /** Lazy getters for overlay/toolbar containers (may be null before DOM mount). */
  getOverlayEl: () => HTMLElement | null
  getToolbarEl: () => HTMLElement | null
}

interface ActiveSession {
  nodeId: string
  definition: DeepEditingDefinition
  extension: MaterialDesignerExtension
  currentPhase: DeepEditingPhase
  /** Whether onEnter has been called for the initial phase. */
  mounted: boolean
}

/**
 * Generic deep editing FSM orchestrator.
 * Manages phase lifecycle, transition routing, and keyboard delegation
 * for any material that declares a DeepEditingDefinition.
 */
export function useDeepEditing(ctx: DeepEditingContext) {
  let session: ActiveSession | null = null
  /** Guard against re-entrancy: blur during exit() calls requestTransition which calls transitionTo */
  let exiting = false

  function findPhase(definition: DeepEditingDefinition, phaseId: string): DeepEditingPhase | undefined {
    return definition.phases.find(p => p.id === phaseId)
  }

  function getContainers() {
    const overlay = ctx.getOverlayEl()
    const toolbar = ctx.getToolbarEl()
    if (!overlay || !toolbar)
      return null
    return {
      overlay,
      toolbar,
      requestTransition: (phaseId: string) => transitionTo(phaseId),
    }
  }

  /**
   * Enter deep editing for a node.
   * Sets store-level state immediately. The initial phase's onEnter is
   * deferred until mountCurrentPhase() is called (after Vue renders the
   * overlay/toolbar containers via nextTick).
   */
  function enter(nodeId: string): boolean {
    const { store } = ctx
    const node = store.getElementById(nodeId)
    if (!node)
      return false

    const ext = store.getDesignerExtension(node.type)
    if (!ext?.deepEditing)
      return false

    const definition = ext.deepEditing
    const initialPhase = findPhase(definition, definition.initialPhase)
    if (!initialPhase)
      return false

    // Enter store-level deep editing state (triggers v-show / computed updates)
    store.enterDeepEditing(nodeId)

    session = {
      nodeId,
      definition,
      extension: ext,
      currentPhase: initialPhase,
      mounted: false,
    }

    return true
  }

  /**
   * Mount the current phase's UI into overlay/toolbar containers.
   * Must be called after Vue has rendered the containers (e.g. in nextTick).
   */
  function mountCurrentPhase(): boolean {
    if (!session || session.mounted)
      return false

    const containers = getContainers()
    if (!containers)
      return false

    const node = ctx.store.getElementById(session.nodeId)
    if (!node)
      return false

    session.currentPhase.onEnter(containers, node)
    session.mounted = true
    return true
  }

  /**
   * Clean up the current FSM phase without resetting store state.
   * Called by the store's exitDeepEditing() via the registered cleanup callback.
   */
  function cleanupPhase(): void {
    if (!session)
      return

    exiting = true
    if (session.mounted) {
      session.currentPhase.onExit()
    }
    session = null
    exiting = false
  }

  // Register cleanup callback so store.exitDeepEditing() can clean up the FSM phase
  ctx.store.setDeepEditingCleanup(cleanupPhase)

  /** Exit deep editing entirely, cleaning up the current phase. */
  function exit(): void {
    if (!session)
      return

    // exitDeepEditing() will call cleanupPhase() via the registered callback
    ctx.store.exitDeepEditing()
  }

  /** Transition to a named phase. */
  function transitionTo(phaseId: string): boolean {
    if (!session || exiting)
      return false

    const { store } = ctx
    const nextPhase = findPhase(session.definition, phaseId)
    if (!nextPhase)
      return false

    const node = store.getElementById(session.nodeId)
    if (!node)
      return false

    const containers = getContainers()
    if (!containers)
      return false

    // Exit current phase
    if (session.mounted) {
      session.currentPhase.onExit()
    }

    // Update state
    session.currentPhase = nextPhase
    session.mounted = true
    store.transitionPhase(phaseId)

    // Enter new phase (always re-read containers from refs for freshness)
    nextPhase.onEnter(containers, node)

    return true
  }

  /**
   * Process keyboard events. Delegates to phase keyboard handler first,
   * then checks for 'escape' transitions.
   */
  function handleKeyDown(e: KeyboardEvent): boolean {
    if (!session || !session.mounted)
      return false

    const { store } = ctx
    const node = store.getElementById(session.nodeId)
    if (!node)
      return false

    // Phase keyboard handler gets first shot
    if (session.currentPhase.keyboardHandler) {
      const handled = session.currentPhase.keyboardHandler.handleKey(e, node)
      if (handled)
        return true
    }

    // Check for escape transition
    if (e.key === 'Escape') {
      const escapeTransition = session.currentPhase.transitions.find(
        t => t.trigger === 'escape',
      )
      if (escapeTransition) {
        e.preventDefault()
        e.stopPropagation()
        transitionTo(escapeTransition.to)
        return true
      }
      // No escape transition = exit deep editing entirely
      e.preventDefault()
      e.stopPropagation()
      exit()
      return true
    }

    return false
  }

  /** Whether a session is active. */
  function isActive(): boolean {
    return session !== null
  }

  /** Get the current active session's node ID. */
  function getNodeId(): string | undefined {
    return session?.nodeId
  }

  /** Get the current phase ID. */
  function getCurrentPhaseId(): string | undefined {
    return session?.currentPhase.id
  }

  return {
    enter,
    mountCurrentPhase,
    exit,
    transitionTo,
    handleKeyDown,
    isActive,
    getNodeId,
    getCurrentPhaseId,
  }
}
