/**
 * @vitest-environment happy-dom
 *
 * Decision-level tests for CanvasInteractionController. These specifically
 * cover the bug classes the audit (.github/audit/202605010152.md) identified:
 *
 * 1. Cmd/Ctrl click on an unselected element MUST add (not toggle off).
 * 2. Click that follows a moved drag MUST be ignored (no collapse to single).
 * 3. Cmd/Ctrl on an already-selected element MUST toggle off.
 * 4. Right-click MUST NOT enter editing-session and MUST NOT start a drag.
 *
 * The controller depends on the real DesignerStore (selection model + editing
 * session manager + extension registry) so we go through the public API rather
 * than mocking, which would re-introduce the divergence the audit warned
 * against.
 */
import type { MaterialDesignerExtension } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { DesignerStore } from '../store/designer-store'
import { useCanvasInteractionController } from './canvas-interaction-controller'

function plainExtension(): MaterialDesignerExtension {
  return {
    renderContent: () => undefined,
  } as unknown as MaterialDesignerExtension
}

function clickTriggerExtension(): MaterialDesignerExtension {
  return {
    renderContent: () => undefined,
    enterTrigger: 'click',
    geometry: {
      hitTest: () => ({ kind: 'cell', payload: { row: 0, col: 0 } }),
      canvasToLocal: (p: { x: number, y: number }) => p,
      localToCanvas: (p: { x: number, y: number }) => p,
    },
  } as unknown as MaterialDesignerExtension
}

function makePageEl(): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 1000,
    width: 1000,
    height: 1000,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  document.body.appendChild(el)
  return el
}

function pdEvent(name: string, x: number, y: number, opts: { meta?: boolean, ctrl?: boolean, button?: number } = {}): PointerEvent {
  return new PointerEvent(name, {
    clientX: x,
    clientY: y,
    pointerId: 1,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    button: opts.button ?? 0,
    bubbles: true,
  })
}

function clickEvent(x: number, y: number, opts: { meta?: boolean, ctrl?: boolean } = {}): MouseEvent {
  return new MouseEvent('click', {
    clientX: x,
    clientY: y,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    bubbles: true,
  })
}

function setup() {
  const store = new DesignerStore()
  store.registerDesignerFactory('rect', () => plainExtension())
  store.schema.elements.push(
    { id: 'a', type: 'rect', x: 0, y: 0, width: 50, height: 50, rotation: 0, props: {} } as never,
    { id: 'b', type: 'rect', x: 100, y: 0, width: 50, height: 50, rotation: 0, props: {} } as never,
  )
  const pageEl = makePageEl()
  const target = document.createElement('div')
  document.body.appendChild(target)
  const controller = useCanvasInteractionController({
    store,
    getPageEl: () => pageEl,
    getScrollEl: () => pageEl,
  })
  function pdOn(elementId: string, e: PointerEvent) {
    Object.defineProperty(e, 'currentTarget', { value: target, configurable: true })
    controller.handleElementPointerDown(e, elementId)
  }
  return { store, controller, pdOn }
}

describe('useCanvasInteractionController', () => {
  it('cmd-click on unselected element ADDs and the follow-up click does not toggle off', () => {
    const { store, controller, pdOn } = setup()
    store.selection.select('a')

    pdOn('b', pdEvent('pointerdown', 110, 10, { meta: true }))
    window.dispatchEvent(pdEvent('pointerup', 110, 10, { meta: true }))
    controller.handleElementClick(clickEvent(110, 10, { meta: true }), 'b')

    expect(store.selection.ids.sort()).toEqual(['a', 'b'])
  })

  it('cmd-click on already-selected element toggles it off', () => {
    const { store, controller, pdOn } = setup()
    store.selection.selectMultiple(['a', 'b'])

    pdOn('b', pdEvent('pointerdown', 110, 10, { meta: true }))
    window.dispatchEvent(pdEvent('pointerup', 110, 10, { meta: true }))
    controller.handleElementClick(clickEvent(110, 10, { meta: true }), 'b')

    expect(store.selection.ids).toEqual(['a'])
  })

  it('a click that follows a moved drag does not collapse multi-selection', () => {
    const { store, controller, pdOn } = setup()
    store.selection.selectMultiple(['a', 'b'])

    pdOn('a', pdEvent('pointerdown', 10, 10))
    // Simulate movement
    window.dispatchEvent(pdEvent('pointermove', 30, 30))
    window.dispatchEvent(pdEvent('pointerup', 30, 30))
    controller.handleElementClick(clickEvent(30, 30), 'a')

    expect(store.selection.ids.sort()).toEqual(['a', 'b'])
  })

  it('right-click preserves an existing multi-selection', () => {
    const { store, pdOn } = setup()
    store.selection.selectMultiple(['a', 'b'])

    pdOn('a', pdEvent('pointerdown', 10, 10, { button: 2 }))

    expect(store.selection.ids.sort()).toEqual(['a', 'b'])
  })

  it('right-click on an unselected element collapses to that element', () => {
    const { store, pdOn } = setup()
    store.selection.select('a')

    pdOn('b', pdEvent('pointerdown', 110, 10, { button: 2 }))

    expect(store.selection.ids).toEqual(['b'])
  })

  it('click on a click-trigger material enters editing-session and the click does not re-select', () => {
    const { store, controller, pdOn } = setup()
    store.registerDesignerFactory('cell-table', () => clickTriggerExtension())
    store.schema.elements.push(
      { id: 't', type: 'cell-table', x: 200, y: 0, width: 80, height: 80, rotation: 0, props: {} } as never,
    )

    pdOn('t', pdEvent('pointerdown', 210, 10))
    expect(store.editingSession.isActive).toBe(true)
    expect(store.editingSession.activeNodeId).toBe('t')
    expect(store.selection.ids).toEqual(['t'])

    window.dispatchEvent(pdEvent('pointerup', 210, 10))
    controller.handleElementClick(clickEvent(210, 10), 't')

    // Still in session, selection unchanged
    expect(store.editingSession.isActive).toBe(true)
    expect(store.selection.ids).toEqual(['t'])
  })

  it('cmd-click on a click-trigger material multi-selects instead of entering editing-session', () => {
    const { store, pdOn } = setup()
    store.registerDesignerFactory('cell-table', () => clickTriggerExtension())
    store.schema.elements.push(
      { id: 't', type: 'cell-table', x: 200, y: 0, width: 80, height: 80, rotation: 0, props: {} } as never,
    )
    store.selection.select('a')

    pdOn('t', pdEvent('pointerdown', 210, 10, { meta: true }))

    expect(store.editingSession.isActive).toBe(false)
    expect(store.selection.ids.sort()).toEqual(['a', 't'])
  })
})
