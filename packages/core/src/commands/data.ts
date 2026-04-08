import type { BindingRef, MaterialNode, TableDataSchema, TableNode } from '@easyink/schema'
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

/** Set table.source on a table-data node (first field drag auto-trigger). */
export class BindTableSourceCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'bind-table-source'
  readonly description = 'Bind table data source'
  private oldSource: BindingRef | undefined

  constructor(
    private node: TableNode,
    private source: BindingRef,
  ) {}

  execute(): void {
    const table = this.node.table as TableDataSchema
    this.oldSource = table.source ? deepClone(table.source) : undefined
    table.source = deepClone(this.source)
  }

  undo(): void {
    const table = this.node.table as TableDataSchema
    if (this.oldSource) {
      table.source = this.oldSource
    }
    else {
      table.source = undefined
    }
  }
}

/** Clear table.source and all cell bindings atomically. */
export class ClearTableSourceCommand implements Command {
  readonly id = generateId('cmd')
  readonly type = 'clear-table-source'
  readonly description = 'Clear table data source'
  private oldSource: BindingRef | undefined
  private oldCellBindings: Array<{ rowIndex: number, cellIndex: number, binding: BindingRef }> = []

  constructor(
    private node: TableNode,
  ) {}

  execute(): void {
    const table = this.node.table as TableDataSchema
    this.oldSource = table.source ? deepClone(table.source) : undefined
    table.source = undefined!

    // Clear all cell bindings and save snapshots for undo
    this.oldCellBindings = []
    for (let ri = 0; ri < table.topology.rows.length; ri++) {
      const row = table.topology.rows[ri]!
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci]!
        if (cell.binding) {
          this.oldCellBindings.push({ rowIndex: ri, cellIndex: ci, binding: deepClone(cell.binding) })
          cell.binding = undefined
        }
      }
    }
  }

  undo(): void {
    const table = this.node.table as TableDataSchema
    if (this.oldSource) {
      table.source = this.oldSource
    }
    for (const { rowIndex, cellIndex, binding } of this.oldCellBindings) {
      table.topology.rows[rowIndex]!.cells[cellIndex]!.binding = binding
    }
  }
}
