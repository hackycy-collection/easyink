import type { DataSourceDescriptor } from './types'

/**
 * DataSourceRegistry manages data source descriptors for the designer.
 */
export class DataSourceRegistry {
  private _sources = new Map<string, DataSourceDescriptor>()

  registerSource(source: DataSourceDescriptor): void {
    this._sources.set(source.id, source)
  }

  unregisterSource(id: string): void {
    this._sources.delete(id)
  }

  getSource(id: string): DataSourceDescriptor | undefined {
    return this._sources.get(id)
  }

  findSourceByTag(tag: string): DataSourceDescriptor | undefined {
    for (const source of this._sources.values()) {
      if (source.tag === tag)
        return source
    }
    return undefined
  }

  getSources(): DataSourceDescriptor[] {
    return [...this._sources.values()]
  }

  clear(): void {
    this._sources.clear()
  }
}
