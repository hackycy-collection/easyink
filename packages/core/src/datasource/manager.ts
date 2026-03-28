import type {
  DataFieldNode,
  DataSourceManagerEvents,
  DataSourceRegistration,
} from './types'

/**
 * DataSourceManager — manages registration and lookup of data sources.
 *
 * Data sources are registered by the integrating developer (not by template users).
 * Each data source is keyed by its displayName. Keys are globally unique;
 * re-registering the same name overwrites the previous entry.
 */
export class DataSourceManager {
  private sources = new Map<string, DataSourceRegistration>()
  private listeners = new Map<keyof DataSourceManagerEvents, Set<(...args: any[]) => void>>()

  /**
   * Register a data source.
   * Re-registering the same name overwrites the previous entry.
   * Validates that all leaf-node keys do not contain '.'.
   * @throws If any leaf key contains '.'
   */
  register(name: string, registration: DataSourceRegistration): void {
    this.validateFields(registration.fields)
    this.sources.set(name, registration)
    this.emit('registered', name, registration)
  }

  /**
   * Unregister a data source by name.
   * @throws If the data source is not found
   */
  unregister(name: string): void {
    if (!this.sources.has(name)) {
      throw new Error(`Data source "${name}" is not registered`)
    }
    this.sources.delete(name)
    this.emit('unregistered', name)
  }

  /**
   * Check if a data source is registered.
   */
  has(name: string): boolean {
    return this.sources.has(name)
  }

  /**
   * Get a data source registration by name.
   */
  get(name: string): DataSourceRegistration | undefined {
    return this.sources.get(name)
  }

  /**
   * List all registered data source names with their registrations.
   */
  list(): Array<{ name: string, registration: DataSourceRegistration }> {
    return [...this.sources.entries()].map(([name, registration]) => ({ name, registration }))
  }

  /**
   * Get the field tree for a specific data source.
   * Returns the fields array as-is (recursive children structure).
   */
  getFields(name: string): DataFieldNode[] {
    const source = this.sources.get(name)
    if (!source) {
      throw new Error(`Data source "${name}" is not registered`)
    }
    return source.fields
  }

  /**
   * Get field trees for all registered data sources.
   * Returns an array of { name, displayName, icon, fields }.
   */
  getFieldTree(): Array<{
    name: string
    displayName: string
    icon?: string
    fields: DataFieldNode[]
  }> {
    return [...this.sources.entries()].map(([name, reg]) => ({
      name,
      displayName: reg.displayName,
      icon: reg.icon,
      fields: reg.fields,
    }))
  }

  /**
   * Listen to events.
   */
  on<K extends keyof DataSourceManagerEvents>(
    event: K,
    listener: DataSourceManagerEvents[K],
  ): void {
    let listeners = this.listeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.listeners.set(event, listeners)
    }
    listeners.add(listener)
  }

  /**
   * Remove an event listener.
   */
  off<K extends keyof DataSourceManagerEvents>(
    event: K,
    listener: DataSourceManagerEvents[K],
  ): void {
    this.listeners.get(event)?.delete(listener)
  }

  /**
   * Clear all registrations and listeners.
   */
  clear(): void {
    this.sources.clear()
    this.listeners.clear()
  }

  private emit<K extends keyof DataSourceManagerEvents>(
    event: K,
    ...args: Parameters<DataSourceManagerEvents[K]>
  ): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        listener(...args)
      }
    }
  }

  /**
   * Validate field tree: all leaf-node keys must not contain '.'.
   */
  private validateFields(fields: DataFieldNode[]): void {
    for (const field of fields) {
      if (field.key && field.key.includes('.')) {
        throw new Error(`Data field key "${field.key}" must not contain '.'`)
      }
      if (field.children) {
        this.validateFields(field.children)
      }
    }
  }
}
