import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { UsageRule } from '@easyink/shared'
import type { Command } from '../command'
import { deepClone, generateId } from '@easyink/shared'
import { findNode } from './helpers'

// ─── Data Commands ──────────────────────────────────────────────────

export class BindFieldCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'bind-field'
  readonly description = 'Bind field'
  private oldBinding: BindingRef | BindingRef[] | undefined

  constructor(
    private elements: MaterialNode[],
    private nodeId: string,
    private binding: BindingRef,
  ) {}

  execute(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    this.oldBinding = deepClone(node.binding)
    node.binding = deepClone(this.binding)
  }

  undo(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    node.binding = this.oldBinding
  }
}

export class ClearBindingCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'clear-binding'
  readonly description = 'Clear binding'
  private oldBinding: BindingRef | BindingRef[] | undefined

  constructor(
    private elements: MaterialNode[],
    private nodeId: string,
  ) {}

  execute(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    this.oldBinding = deepClone(node.binding)
    node.binding = undefined
  }

  undo(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    node.binding = this.oldBinding
  }
}

export class UpdateUsageCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'update-usage'
  readonly description = 'Update usage'
  private oldUsage: UsageRule | undefined

  constructor(
    private elements: MaterialNode[],
    private nodeId: string,
    private bindIndex: number,
    private usage: UsageRule,
  ) {}

  execute(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    const ref = this.getRef(node)
    if (!ref)
      return
    this.oldUsage = deepClone(ref.usage)
    ref.usage = deepClone(this.usage)
  }

  undo(): void {
    const node = findNode(this.elements, this.nodeId)
    if (!node)
      return
    const ref = this.getRef(node)
    if (!ref)
      return
    ref.usage = this.oldUsage
  }

  private getRef(node: MaterialNode): BindingRef | undefined {
    if (Array.isArray(node.binding))
      return node.binding[this.bindIndex]
    if (this.bindIndex === 0)
      return node.binding
    return undefined
  }
}

export class UnionDropCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'union-drop'
  readonly description = 'Union drop'
  private nodeIds: string[]

  constructor(
    private elements: MaterialNode[],
    private nodes: MaterialNode[],
  ) {
    this.nodeIds = nodes.map(n => n.id)
  }

  execute(): void {
    for (const node of this.nodes)
      this.elements.push(node)
  }

  undo(): void {
    const ids = new Set(this.nodeIds)
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (ids.has(this.elements[i]!.id))
        this.elements.splice(i, 1)
    }
  }
}
