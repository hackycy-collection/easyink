/**
 * @vitest-environment happy-dom
 */
import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { Plugin, ViewContext } from './types'
import { describe, expect, it } from 'vitest'
import { h } from '../view'
import { createEditorState } from './state'
import { SetPropStep } from './steps/set-prop'
import { createEditorView } from './view'

function emptyDoc(elements: MaterialNode[] = []): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: { mode: 'fixed', width: 210, height: 297 },
    guides: { x: [], y: [] },
    elements,
  }
}

function rect(id: string, x: number, y: number, w = 10, h = 10): MaterialNode {
  return {
    id,
    type: 'rect',
    x,
    y,
    width: w,
    height: h,
    props: {},
  } as unknown as MaterialNode
}

describe('editorView', () => {
  it('renders plugin content layer on mount', () => {
    const renderPlugin: Plugin = {
      key: 'test/render',
      view: {
        render(ctx: ViewContext) {
          for (const el of ctx.state.doc.elements) {
            ctx.layers.content.push(
              h('div', { 'class': 'el', 'data-id': el.id }, el.id),
            )
          }
          return null
        },
      },
    }
    const state = createEditorState({
      doc: emptyDoc([rect('a', 0, 0), rect('b', 20, 20)]),
      plugins: [renderPlugin],
    })
    const mount = document.createElement('div')
    const canvas = document.createElement('div')
    const view = createEditorView({ state, mount, canvasMount: canvas })

    const els = canvas.querySelectorAll('.el')
    expect(els.length).toBe(2)
    expect(els[0].getAttribute('data-id')).toBe('a')
    expect(els[1].getAttribute('data-id')).toBe('b')

    view.destroy()
    expect(canvas.querySelectorAll('.el').length).toBe(0)
  })

  it('re-renders after dispatch (flushSync)', () => {
    const renderPlugin: Plugin = {
      key: 'test/render',
      view: {
        render(ctx) {
          for (const el of ctx.state.doc.elements) {
            ctx.layers.content.push(
              h('div', { 'class': 'el', 'data-x': String(el.x) }),
            )
          }
          return null
        },
      },
    }
    const state = createEditorState({
      doc: emptyDoc([rect('a', 0, 0)]),
      plugins: [renderPlugin],
    })
    const mount = document.createElement('div')
    const canvas = document.createElement('div')
    const view = createEditorView({ state, mount, canvasMount: canvas })

    expect(canvas.querySelector('.el')?.getAttribute('data-x')).toBe('0')

    view.dispatch(view.state.tr.step(new SetPropStep('a', 'x', 42)))
    view.flushSync()
    expect(canvas.querySelector('.el')?.getAttribute('data-x')).toBe('42')

    view.destroy()
  })

  it('notifies subscribers and stops after destroy', () => {
    const state = createEditorState({
      doc: emptyDoc([rect('a', 0, 0)]),
      plugins: [],
    })
    const mount = document.createElement('div')
    const canvas = document.createElement('div')
    const view = createEditorView({ state, mount, canvasMount: canvas })

    const received: number[] = []
    const unsub = view.subscribe(s => received.push(s.doc.elements[0].x))

    view.dispatch(view.state.tr.step(new SetPropStep('a', 'x', 1)))
    view.dispatch(view.state.tr.step(new SetPropStep('a', 'x', 2)))
    expect(received).toEqual([1, 2])

    unsub()
    view.dispatch(view.state.tr.step(new SetPropStep('a', 'x', 3)))
    expect(received).toEqual([1, 2])

    view.destroy()
  })
})
