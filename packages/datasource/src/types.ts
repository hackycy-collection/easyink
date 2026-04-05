import type { MaterialUseToken } from '@easyink/shared'

/**
 * Descriptor for a data source. The field tree is the backbone
 * of the data source panel in the designer.
 */
export interface DataSourceDescriptor {
  id: string
  name: string
  tag?: string
  title?: string
  icon?: string
  expand?: boolean
  headless?: boolean
  fields: DataFieldNode[]
  meta?: Record<string, unknown>
}

/**
 * A node in the field tree. Supports recursive nesting.
 */
export interface DataFieldNode {
  name: string
  key?: string
  path?: string
  title?: string
  id?: string
  tag?: string
  use?: MaterialUseToken
  props?: Record<string, unknown>
  bindIndex?: number
  union?: DataUnionBinding[]
  expand?: boolean
  fields?: DataFieldNode[]
  meta?: Record<string, unknown>
}

/**
 * Union binding descriptor for one-drag-multi-create scenarios.
 */
export interface DataUnionBinding {
  name?: string
  key?: string
  path?: string
  title?: string
  id?: string
  tag?: string
  use?: string
  offsetX?: number
  offsetY?: number
  props?: Record<string, unknown>
}

/**
 * Context passed to data adapters when loading data at runtime.
 */
export interface DataLoadContext {
  params?: Record<string, unknown>
  signal?: AbortSignal
}

/**
 * Data adapter for fetching data at runtime.
 * Registered by host applications.
 */
export interface DataAdapter {
  id: string
  match: (source: DataSourceDescriptor) => boolean
  load: (source: DataSourceDescriptor, context: DataLoadContext) => Promise<unknown>
}

/**
 * Usage resolver transforms raw data values according to binding `usage` rules.
 */
export interface UsageResolver {
  id: string
  resolve: (value: unknown, options?: Record<string, unknown>) => unknown
}
