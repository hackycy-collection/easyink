import type { DocumentSchema } from '@easyink/schema'
import type { Step, StepJSON, StepMap, StepResult, StepSpec } from '../types'
import { getByPath, patchNode, setByPathImmutable, snapshotJson } from '../doc-utils'
import { identityStepMap } from '../mapping'
import { registerStepType } from '../step'

/**
 * set-prop：按 nodeId + 点分路径设置字段。
 * path 示例：'props.fontSize'、'width'、'binding'。
 * value=undefined 即删除该字段。
 */
export class SetPropStep implements Step {
  readonly stepType = 'set-prop'
  constructor(
    public readonly nodeId: string,
    public readonly path: string,
    public readonly value: unknown,
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const next = patchNode(doc, this.nodeId, node =>
      setByPathImmutable(node, this.path, snapshotJson(this.value)))
    if (!next)
      return { failed: `[set-prop] node ${this.nodeId} not found` }
    return { doc: next }
  }

  invert(doc: DocumentSchema): Step {
    const node = doc.elements.find(el => el.id === this.nodeId)
    const prev = node ? snapshotJson(getByPath(node, this.path)) : undefined
    return new SetPropStep(this.nodeId, this.path, prev)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, nodeId: this.nodeId, path: this.path, value: snapshotJson(this.value) }
  }
}

export const setPropStepSpec: StepSpec = {
  stepType: 'set-prop',
  fromJSON: json => new SetPropStep(json.nodeId as string, json.path as string, json.value),
}

registerStepType(setPropStepSpec)
