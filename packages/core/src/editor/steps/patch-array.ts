import type { DocumentSchema } from '@easyink/schema'
import type { Step, StepJSON, StepMap, StepResult, StepSpec } from '../types'
import { getByPath, patchNode, setByPathImmutable, snapshotJson } from '../doc-utils'
import { identityStepMap } from '../mapping'
import { registerStepType } from '../step'

export type PatchArrayOp
  = | { op: 'insert', index: number, value: unknown }
    | { op: 'remove', index: number }
    | { op: 'move', fromIndex: number, toIndex: number }
    | { op: 'replace', index: number, value: unknown }

/**
 * 对某 node 的某个数组字段批量执行结构操作。
 * arrayPath 为 node 内部点分路径，指向一个数组，例如 'children' / 'props.items'。
 */
export class PatchArrayStep implements Step {
  readonly stepType = 'patch-array'
  constructor(
    public readonly nodeId: string,
    public readonly arrayPath: string,
    public readonly ops: PatchArrayOp[],
  ) {}

  apply(doc: DocumentSchema): StepResult {
    const node = doc.elements.find(el => el.id === this.nodeId)
    if (!node)
      return { failed: `[patch-array] ${this.nodeId} not found` }
    const arr = getByPath(node, this.arrayPath)
    if (!Array.isArray(arr))
      return { failed: `[patch-array] ${this.arrayPath} is not an array on ${this.nodeId}` }
    const next = [...arr]
    for (const op of this.ops) {
      switch (op.op) {
        case 'insert':
          next.splice(op.index, 0, snapshotJson(op.value))
          break
        case 'remove':
          next.splice(op.index, 1)
          break
        case 'replace':
          next[op.index] = snapshotJson(op.value)
          break
        case 'move': {
          const [item] = next.splice(op.fromIndex, 1)
          next.splice(op.toIndex, 0, item)
          break
        }
      }
    }
    const patched = patchNode(doc, this.nodeId, n => setByPathImmutable(n, this.arrayPath, next))
    return { doc: patched ?? doc }
  }

  invert(doc: DocumentSchema): Step {
    const node = doc.elements.find(el => el.id === this.nodeId)!
    const arr = getByPath(node, this.arrayPath) as unknown[]
    // 正向执行一遍，记录逆向 op 序列
    const working = [...arr]
    const inverseOps: PatchArrayOp[] = []
    for (const op of this.ops) {
      switch (op.op) {
        case 'insert':
          inverseOps.unshift({ op: 'remove', index: op.index })
          working.splice(op.index, 0, op.value)
          break
        case 'remove': {
          const removed = working.splice(op.index, 1)[0]
          inverseOps.unshift({ op: 'insert', index: op.index, value: snapshotJson(removed) })
          break
        }
        case 'replace': {
          const prev = working[op.index]
          inverseOps.unshift({ op: 'replace', index: op.index, value: snapshotJson(prev) })
          working[op.index] = op.value
          break
        }
        case 'move': {
          inverseOps.unshift({ op: 'move', fromIndex: op.toIndex, toIndex: op.fromIndex })
          const [item] = working.splice(op.fromIndex, 1)
          working.splice(op.toIndex, 0, item)
          break
        }
      }
    }
    return new PatchArrayStep(this.nodeId, this.arrayPath, inverseOps)
  }

  getMap(): StepMap {
    return identityStepMap
  }

  toJSON(): StepJSON {
    return { stepType: this.stepType, nodeId: this.nodeId, arrayPath: this.arrayPath, ops: snapshotJson(this.ops) }
  }
}

export const patchArrayStepSpec: StepSpec = {
  stepType: 'patch-array',
  fromJSON: json => new PatchArrayStep(
    json.nodeId as string,
    json.arrayPath as string,
    (json.ops as PatchArrayOp[]) ?? [],
  ),
}

registerStepType(patchArrayStepSpec)
