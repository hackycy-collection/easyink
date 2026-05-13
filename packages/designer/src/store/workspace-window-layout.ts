import type { WorkspaceWindowState } from '../types'

export interface WorkspaceRect {
  width: number
  height: number
}

export const WORKSPACE_RULER_SIZE = 20
export const WORKSPACE_WINDOW_EDGE_GAP = 12
export const WORKSPACE_WINDOW_TITLEBAR_VISIBLE_HEIGHT = 32

export function hasUsableWorkspaceRect(rect: WorkspaceRect): boolean {
  return Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > WORKSPACE_RULER_SIZE
    && rect.height > WORKSPACE_RULER_SIZE
}

export function resolveAnchoredWorkspaceWindows(
  windows: WorkspaceWindowState[],
  rect: WorkspaceRect,
): boolean {
  if (!hasUsableWorkspaceRect(rect))
    return false

  let changed = false
  for (const win of windows) {
    if (win.x < 0) {
      win.x = rect.width - win.width - WORKSPACE_WINDOW_EDGE_GAP
      changed = true
    }
    if (win.y < 0) {
      win.y = rect.height - win.height - WORKSPACE_WINDOW_EDGE_GAP
      changed = true
    }
  }
  return changed
}

export function clampWorkspaceWindows(
  windows: WorkspaceWindowState[],
  rect: WorkspaceRect,
): boolean {
  if (!hasUsableWorkspaceRect(rect))
    return false

  let changed = false
  for (const win of windows) {
    const maxX = rect.width - win.width
    const maxY = rect.height - WORKSPACE_WINDOW_TITLEBAR_VISIBLE_HEIGHT
    const nextX = maxX <= WORKSPACE_RULER_SIZE
      ? WORKSPACE_RULER_SIZE
      : Math.max(WORKSPACE_RULER_SIZE, Math.min(win.x, maxX))
    const nextY = maxY <= WORKSPACE_RULER_SIZE
      ? WORKSPACE_RULER_SIZE
      : Math.max(WORKSPACE_RULER_SIZE, Math.min(win.y, maxY))

    if (win.x !== nextX) {
      win.x = nextX
      changed = true
    }
    if (win.y !== nextY) {
      win.y = nextY
      changed = true
    }
  }
  return changed
}
