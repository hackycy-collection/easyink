import type { MaterialNode } from '@easyink/schema'

/**
 * SelectionModel tracks which elements are currently selected in the designer.
 */
export class SelectionModel {
  private _ids: Set<string> = new Set()
  private _listeners: Array<() => void> = []

  get ids(): string[] {
    return [...this._ids]
  }

  get count(): number {
    return this._ids.size
  }

  get isEmpty(): boolean {
    return this._ids.size === 0
  }

  select(id: string): void {
    this._ids.clear()
    this._ids.add(id)
    this.notify()
  }

  selectMultiple(ids: string[]): void {
    this._ids.clear()
    for (const id of ids) {
      this._ids.add(id)
    }
    this.notify()
  }

  toggle(id: string): void {
    if (this._ids.has(id)) {
      this._ids.delete(id)
    }
    else {
      this._ids.add(id)
    }
    this.notify()
  }

  add(id: string): void {
    this._ids.add(id)
    this.notify()
  }

  remove(id: string): void {
    this._ids.delete(id)
    this.notify()
  }

  has(id: string): boolean {
    return this._ids.has(id)
  }

  clear(): void {
    if (this._ids.size === 0)
      return
    this._ids.clear()
    this.notify()
  }

  /**
   * Filter selection to only include IDs that match existing nodes.
   */
  reconcile(nodes: MaterialNode[]): void {
    const existing = new Set(nodes.map(n => n.id))
    let changed = false
    for (const id of this._ids) {
      if (!existing.has(id)) {
        this._ids.delete(id)
        changed = true
      }
    }
    if (changed)
      this.notify()
  }

  onChange(listener: () => void): () => void {
    this._listeners.push(listener)
    return () => {
      const idx = this._listeners.indexOf(listener)
      if (idx >= 0)
        this._listeners.splice(idx, 1)
    }
  }

  private notify(): void {
    for (const listener of this._listeners) {
      listener()
    }
  }
}
