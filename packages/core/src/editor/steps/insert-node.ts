import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { Step, StepJSON, StepMap, StepResult, StepSpec } from '../types'
import { findNodeIndex, snapshotJson, withElements } from '../doc-utils'
import { identityStepMap } from '../mapping'
import { registerStepType } from '../step'

export class InsertNodeStep implements Step {
  readonly stepType = 'insert-node'
  constructor(
    public readonly index: number,
    public readonly node: MaterialNode,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    if (doc.elements.some(el => el.id === this.node.id))
      return { failed: `[insert-node] duplicate id ${this.node.id}` }
    const clamped = Math.max(0, Math.min(this.index, doc.elements.length))
    return {
      doc: withElements(doc, (elements) => {
        elements.splice(clamped, 0, snapshotJson(this.node))
        return elements
      }),
    }
  }

  invert(): Step {
    return new RemoveNodeStep(this.node.id)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, index: this.index, node: snapshotJson(this.node) }
  }
}

export class RemoveNodeStep implements Step {
  readonly stepType = 'remove-node'
  constructor(public readonly nodeId: string) {}

  apply(doc: DocumentSchema): StepResult {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      return { failed: `[remove-node] ${this.nodeId} not found` }
    return {
      doc: withElements(doc, (elements) => {
        elements.splice(idx, 1)
        return elements
      }),
    }
  }

  invert(doc: DocumentSchema): Step {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      throw new Error(`[remove-node] cannot invert, node ${this.nodeId} missing`)
    const node = snapshotJson(doc.elements[idx]!)
    return new InsertNodeStep(idx, node)
  }

  getMap(): StepMap {
    return {
      mapSelection: (sel) => {
        if (sel.nodeId === this.nodeId)
          return null
        if (sel.type === 'element-range' && Array.isArray(sel.path)) {
          const ids = sel.path as readonly string[]
          const next = ids.filter(id => id !== this.nodeId)
          if (next.length === ids.length)
            return sel
          if (next.length === 0)
            return null
          return {
            ...sel,
            path: Object.freeze(next),
            toJSON: () => ({ type: sel.type, nodeId: null, path: next }),
          }
        }
        return sel
      },
    }
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, nodeId: this.nodeId }
  }
}

export const insertNodeStepSpec: StepSpec = {
  stepType: 'insert-node',
  fromJSON: json => new InsertNodeStep(json.index as number, json.node as MaterialNode),
}

export const removeNodeStepSpec: StepSpec = {
  stepType: 'remove-node',
  fromJSON: json => new RemoveNodeStep(json.nodeId as string),
}

registerStepType(insertNodeStepSpec)
registerStepType(removeNodeStepSpec)
