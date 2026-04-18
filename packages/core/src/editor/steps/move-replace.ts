import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { Step, StepJSON, StepMap, StepResult, StepSpec } from '../types'
import { findNodeIndex, snapshotJson, withElements } from '../doc-utils'
import { identityStepMap } from '../mapping'
import { registerStepType } from '../step'

export class MoveNodeStep implements Step {
  readonly stepType = 'move-node'
  constructor(
    public readonly nodeId: string,
    public readonly toIndex: number,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      return { failed: `[move-node] ${this.nodeId} not found` }
    const clamped = Math.max(0, Math.min(this.toIndex, doc.elements.length - 1))
    if (idx === clamped)
      return { doc }
    return {
      doc: withElements(doc, (elements) => {
        const [node] = elements.splice(idx, 1)
        elements.splice(clamped, 0, node!)
        return elements
      }),
    }
  }

  invert(doc: DocumentSchema): Step {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      throw new Error(`[move-node] cannot invert, ${this.nodeId} missing`)
    return new MoveNodeStep(this.nodeId, idx)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, nodeId: this.nodeId, toIndex: this.toIndex }
  }
}

export class ReplaceNodeStep implements Step {
  readonly stepType = 'replace-node'
  constructor(
    public readonly nodeId: string,
    public readonly next: MaterialNode,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      return { failed: `[replace-node] ${this.nodeId} not found` }
    if (this.next.id !== this.nodeId)
      return { failed: `[replace-node] id mismatch: ${this.nodeId} vs ${this.next.id}` }
    return {
      doc: withElements(doc, (elements) => {
        elements[idx] = snapshotJson(this.next)
        return elements
      }),
    }
  }

  invert(doc: DocumentSchema): Step {
    const idx = findNodeIndex(doc.elements, this.nodeId)
    if (idx < 0)
      throw new Error(`[replace-node] cannot invert, ${this.nodeId} missing`)
    return new ReplaceNodeStep(this.nodeId, snapshotJson(doc.elements[idx]!))
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, nodeId: this.nodeId, next: snapshotJson(this.next) }
  }
}

export const moveNodeStepSpec: StepSpec = {
  stepType: 'move-node',
  fromJSON: json => new MoveNodeStep(json.nodeId as string, json.toIndex as number),
}

export const replaceNodeStepSpec: StepSpec = {
  stepType: 'replace-node',
  fromJSON: json => new ReplaceNodeStep(json.nodeId as string, json.next as MaterialNode),
}

registerStepType(moveNodeStepSpec)
registerStepType(replaceNodeStepSpec)
