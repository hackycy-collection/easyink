import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createEditorState,
  createHistoryPlugin,
  deserializeEditorState,
  elementSelection,
  emptySelection,
  InsertNodeStep,
  MoveNodeStep,
  PatchArrayStep,
  RemoveNodeStep,
  ReplaceNodeStep,
  serializeEditorState,
  SetPropStep,
} from './'

function textNode(id: string, overrides: Partial<MaterialNode> = {}): MaterialNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    props: { content: id },
    ...overrides,
  }
}

function emptyDoc(elements: MaterialNode[] = []): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: { mode: 'fixed', width: 210, height: 297 },
    guides: { x: [], y: [] },
    elements,
  }
}

describe('editor core: state & transactions', () => {
  it('creates a state with empty selection by default', () => {
    const state = createEditorState({ doc: emptyDoc(), plugins: [] })
    expect(state.selection.type).toBe('empty')
    expect(state.doc.elements).toHaveLength(0)
  })

  it('applies a SetPropStep immutably', () => {
    const state = createEditorState({
      doc: emptyDoc([textNode('t1')]),
      plugins: [],
    })
    const tr = state.tr.step(new SetPropStep('t1', 'width', 200))
    const next = state.apply(tr)
    expect(next.doc.elements[0]!.width).toBe(200)
    expect(state.doc.elements[0]!.width).toBe(100) // 原状态未被修改
  })

  it('setSelection updates selection without steps', () => {
    const state = createEditorState({
      doc: emptyDoc([textNode('a')]),
      plugins: [],
    })
    const tr = state.tr.setSelection(elementSelection('a'))
    const next = state.apply(tr)
    expect(next.selection.type).toBe('element')
    expect(next.selection.nodeId).toBe('a')
  })
})

describe('editor core: step invert round-trip', () => {
  const cases: Array<[string, () => { doc: DocumentSchema, step: InstanceType<typeof SetPropStep | typeof InsertNodeStep | typeof RemoveNodeStep | typeof MoveNodeStep | typeof ReplaceNodeStep | typeof PatchArrayStep> }]> = [
    ['SetPropStep', () => ({
      doc: emptyDoc([textNode('a')]),
      step: new SetPropStep('a', 'width', 321),
    })],
    ['InsertNodeStep', () => ({
      doc: emptyDoc([textNode('a')]),
      step: new InsertNodeStep(1, textNode('b', { x: 10 })),
    })],
    ['RemoveNodeStep', () => ({
      doc: emptyDoc([textNode('a'), textNode('b')]),
      step: new RemoveNodeStep('b'),
    })],
    ['MoveNodeStep', () => ({
      doc: emptyDoc([textNode('a'), textNode('b'), textNode('c')]),
      step: new MoveNodeStep('a', 2),
    })],
    ['ReplaceNodeStep', () => ({
      doc: emptyDoc([textNode('a')]),
      step: new ReplaceNodeStep('a', textNode('a', { props: { content: 'new' } })),
    })],
    ['PatchArrayStep (insert+remove)', () => ({
      doc: emptyDoc([textNode('a', { children: [textNode('c1'), textNode('c2')] })]),
      step: new PatchArrayStep('a', 'children', [
        { op: 'insert', index: 1, value: textNode('c-new') },
        { op: 'remove', index: 2 },
      ]),
    })],
  ]

  for (const [name, make] of cases) {
    it(`${name}: apply → invert → apply 还原原 doc`, () => {
      const { doc, step } = make()
      const first = step.apply(doc)
      expect(first.failed).toBeUndefined()
      const inverted = step.invert(doc)
      const back = inverted.apply(first.doc!)
      expect(back.failed).toBeUndefined()
      expect(JSON.stringify(back.doc)).toBe(JSON.stringify(doc))
    })
  }
})

describe('editor core: RemoveNodeStep mapping', () => {
  it('drops element selection when node is removed', () => {
    const state = createEditorState({
      doc: emptyDoc([textNode('a'), textNode('b')]),
      selection: elementSelection('a'),
      plugins: [],
    })
    const tr = state.tr.step(new RemoveNodeStep('a'))
    const next = state.apply(tr)
    expect(next.selection.type).toBe('empty')
  })

  it('keeps selection when other node is removed', () => {
    const state = createEditorState({
      doc: emptyDoc([textNode('a'), textNode('b')]),
      selection: elementSelection('b'),
      plugins: [],
    })
    const next = state.apply(state.tr.step(new RemoveNodeStep('a')))
    expect(next.selection.type).toBe('element')
    expect(next.selection.nodeId).toBe('b')
  })
})

describe('editor core: history plugin', () => {
  const history = createHistoryPlugin({ groupWindowMs: 50 })

  it('undo/redo round-trip', () => {
    const state0 = createEditorState({
      doc: emptyDoc([textNode('a')]),
      plugins: [history],
    })
    const state1 = state0.apply(state0.tr.step(new SetPropStep('a', 'width', 200)))
    expect(state1.doc.elements[0]!.width).toBe(200)

    const undoTr = history.commands!.undo(state1)!
    const state2 = state1.apply(undoTr)
    expect(state2.doc.elements[0]!.width).toBe(100)

    const redoTr = history.commands!.redo(state2)!
    const state3 = state2.apply(redoTr)
    expect(state3.doc.elements[0]!.width).toBe(200)
  })

  it('groups transactions with same historyGroup within window', () => {
    let state = createEditorState({
      doc: emptyDoc([textNode('a')]),
      plugins: [history],
    })
    for (let i = 0; i < 3; i++) {
      const tr = state.tr
        .step(new SetPropStep('a', 'width', 100 + i + 1))
        .setMeta('historyGroup', 'resize:a')
      state = state.apply(tr)
    }
    // 三次修改应合并为一条 undo
    const hist = state.getPluginState<import('./history').HistoryState>('core/history')!
    expect(hist.done).toHaveLength(1)

    const undo = history.commands!.undo(state)!
    const reverted = state.apply(undo)
    expect(reverted.doc.elements[0]!.width).toBe(100)
  })
})

describe('editor core: serialize round-trip', () => {
  it('serialize then deserialize preserves doc & selection', () => {
    const state = createEditorState({
      doc: emptyDoc([textNode('a'), textNode('b')]),
      selection: elementSelection('b'),
      plugins: [],
    })
    const json = serializeEditorState(state)
    const restored = deserializeEditorState(JSON.parse(JSON.stringify(json)), [])
    expect(restored.doc).toEqual(state.doc)
    expect(restored.selection.toJSON()).toEqual(state.selection.toJSON())
  })
})

describe('editor core: plugin dependencies', () => {
  it('throws on missing dependency', () => {
    const a = { key: 'a', dependencies: ['b'] }
    expect(() => createEditorState({ doc: emptyDoc(), plugins: [a] })).toThrow(/missing dependency/)
  })

  it('detects cycles', () => {
    const a = { key: 'a', dependencies: ['b'] }
    const b = { key: 'b', dependencies: ['a'] }
    expect(() => createEditorState({ doc: emptyDoc(), plugins: [a, b] })).toThrow(/cycle/)
  })

  it('topo sorts dependencies before dependents', () => {
    const order: string[] = []
    const makePlugin = (key: string, deps?: string[]) => ({
      key,
      dependencies: deps,
      state: {
        init: () => {
          order.push(key)
          return 0
        },
        apply: (_tr: unknown, prev: number) => prev,
      },
    } as const)
    createEditorState({
      doc: emptyDoc(),
      plugins: [
        makePlugin('c', ['b']) as never,
        makePlugin('a') as never,
        makePlugin('b', ['a']) as never,
      ],
    })
    expect(order).toEqual(['a', 'b', 'c'])
  })
})

// 占位：消除未用的 emptySelection 警告
describe('misc', () => {
  beforeEach(() => {})
  it('empty selection shape', () => {
    const sel = emptySelection()
    expect(sel.toJSON()).toEqual({ type: 'empty', nodeId: null, path: null })
  })
})
