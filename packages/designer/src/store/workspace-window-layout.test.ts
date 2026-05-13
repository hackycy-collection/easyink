import type { WorkspaceWindowState } from '../types'
import { describe, expect, it } from 'vitest'
import { clampWorkspaceWindows, resolveAnchoredWorkspaceWindows } from './workspace-window-layout'

function createWindow(patch: Partial<WorkspaceWindowState> = {}): WorkspaceWindowState {
  return {
    id: 'properties',
    kind: 'properties',
    visible: true,
    collapsed: false,
    x: 640,
    y: 320,
    width: 280,
    height: 500,
    zIndex: 1,
    ...patch,
  }
}

describe('workspace window layout', () => {
  it('keeps persisted coordinates when the workspace is not measurable', () => {
    const windows = [createWindow()]

    expect(resolveAnchoredWorkspaceWindows(windows, { width: 0, height: 0 })).toBe(false)
    expect(clampWorkspaceWindows(windows, { width: 0, height: 0 })).toBe(false)

    expect(windows[0]).toMatchObject({ x: 640, y: 320 })
  })

  it('resolves right and bottom anchored default windows once size is usable', () => {
    const windows = [createWindow({ x: -1, y: -1 })]

    expect(resolveAnchoredWorkspaceWindows(windows, { width: 1000, height: 800 })).toBe(true)

    expect(windows[0]).toMatchObject({ x: 708, y: 288 })
  })

  it('clamps windows to keep their titlebar reachable', () => {
    const windows = [createWindow({ x: 900, y: 900 })]

    expect(clampWorkspaceWindows(windows, { width: 1000, height: 800 })).toBe(true)

    expect(windows[0]).toMatchObject({ x: 720, y: 768 })
  })
})
