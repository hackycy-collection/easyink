import type { WorkspaceWindowState } from '../types'
import { WORKSPACE_RULER_SIZE, WORKSPACE_WINDOW_TITLEBAR_VISIBLE_HEIGHT } from '../store/workspace-window-layout'

export function useWindowDrag(
  getWindowState: () => WorkspaceWindowState,
  getAllWindows: () => WorkspaceWindowState[],
  getContainer: () => HTMLElement | null,
) {
  function onPointerDown(e: PointerEvent) {
    const win = getWindowState()
    const container = getContainer()
    if (!container)
      return

    const startX = e.clientX - win.x
    const startY = e.clientY - win.y

    // bring to front
    const maxZ = Math.max(...getAllWindows().map(w => w.zIndex))
    if (win.zIndex < maxZ) {
      win.zIndex = maxZ + 1
    }

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const rect = container!.getBoundingClientRect()
      const maxX = rect.width - win.width
      const maxY = rect.height - WORKSPACE_WINDOW_TITLEBAR_VISIBLE_HEIGHT
      // If window is larger than container, pin to left/top edge
      win.x = maxX <= WORKSPACE_RULER_SIZE ? WORKSPACE_RULER_SIZE : Math.max(WORKSPACE_RULER_SIZE, Math.min(maxX, ev.clientX - startX))
      win.y = maxY <= WORKSPACE_RULER_SIZE ? WORKSPACE_RULER_SIZE : Math.max(WORKSPACE_RULER_SIZE, Math.min(maxY, ev.clientY - startY))
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  return { onPointerDown }
}
