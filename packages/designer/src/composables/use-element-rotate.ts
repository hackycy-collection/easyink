import type { DesignerStore } from '../store/designer-store'
import { isInteractable, normalizeRotation, RotateMaterialCommand } from '@easyink/core'
import { createGeometryService } from '../editing/geometry-service'
import { isElementRotatable } from '../materials/capabilities'

export interface ElementRotateContext {
  store: DesignerStore
  getPageEl: () => HTMLElement | null
}

/**
 * Creates a pointerdown handler for the rotation handle.
 * Rotation is computed from the angle between the pointer and the element center.
 * Supports:
 * - Continuous drag rotation
 * - Shift key snaps to 15-degree increments
 * - Command merge for single undo entry
 */
export function useElementRotate(ctx: ElementRotateContext) {
  const geometry = createGeometryService(ctx.store, { getPageEl: ctx.getPageEl })

  function onRotatePointerDown(e: PointerEvent, elementId: string) {
    e.stopPropagation()
    e.preventDefault()

    const { store } = ctx
    const node = store.getElementById(elementId)
    if (!node || !isInteractable(node))
      return

    if (!isElementRotatable(store, node))
      return

    const pageEl = ctx.getPageEl()
    if (!pageEl)
      return

    const centerDocX = node.x + node.width / 2
    const centerDocY = node.y + node.height / 2
    const centerScreen = geometry.documentToScreen({ x: centerDocX, y: centerDocY })

    const origRotation = node.rotation ?? 0

    // Initial angle from center to pointer
    const startAngle = Math.atan2(e.clientY - centerScreen.y, e.clientX - centerScreen.x)

    let moved = false

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const currentAngle = Math.atan2(ev.clientY - centerScreen.y, ev.clientX - centerScreen.x)
      const delta = (currentAngle - startAngle) * (180 / Math.PI)
      let newRotation = origRotation + delta

      // Shift key: snap to 15-degree increments
      if (ev.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15
      }

      newRotation = normalizeRotation(newRotation)

      if (newRotation === (node!.rotation ?? 0))
        return

      moved = true
      node!.rotation = newRotation
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)

      if (!moved)
        return

      const finalRotation = node!.rotation ?? 0

      // Reset to original before command
      node!.rotation = origRotation

      const cmd = new RotateMaterialCommand(
        store.schema.elements,
        elementId,
        finalRotation,
      )
      store.commands.execute(cmd)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  return { onRotatePointerDown }
}
