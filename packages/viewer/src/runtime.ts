import type { DataSourceDescriptor } from '@easyink/datasource'
import type { DocumentSchema } from '@easyink/schema'
import type { ExportAdapter, PrintAdapter, ViewerDiagnosticEvent, ViewerOpenInput, ViewerOptions, ViewerRenderResult } from './types'
import { createPagePlan } from '@easyink/core'
import { DataSourceRegistry } from '@easyink/datasource'
import { validateSchema } from '@easyink/schema'

export class ViewerRuntime {
  private _options: ViewerOptions
  private _schema?: DocumentSchema
  private _data: Record<string, unknown> = {}
  private _dataSources: DataSourceDescriptor[] = []
  private _diagnosticHandler?: (event: ViewerDiagnosticEvent) => void
  private _exportAdapters: ExportAdapter[] = []
  private _printAdapters: PrintAdapter[] = []
  private _registry = new DataSourceRegistry()
  private _destroyed = false

  constructor(options: ViewerOptions = {}) {
    this._options = options
  }

  async open(input: ViewerOpenInput): Promise<void> {
    this.ensureNotDestroyed()

    // Validate schema
    const errors = validateSchema(input.schema)
    if (errors.length > 0) {
      const event: ViewerDiagnosticEvent = {
        category: 'schema',
        severity: 'error',
        code: 'INVALID_SCHEMA',
        message: errors.join('; '),
      }
      input.onDiagnostic?.(event)
      throw new Error(`Invalid schema: ${errors.join('; ')}`)
    }

    this._schema = input.schema
    this._data = input.data || {}
    this._dataSources = input.dataSources || []
    this._diagnosticHandler = input.onDiagnostic

    // Register data sources
    for (const source of this._dataSources) {
      this._registry.registerSource(source)
    }
  }

  async updateData(data: Record<string, unknown>): Promise<void> {
    this.ensureNotDestroyed()
    this._data = data
  }

  render(): ViewerRenderResult {
    this.ensureNotDestroyed()
    if (!this._schema) {
      throw new Error('No schema loaded. Call open() first.')
    }

    const plan = createPagePlan(this._schema)
    const diagnostics: ViewerDiagnosticEvent[] = []

    // Convert plan diagnostics
    for (const d of plan.diagnostics) {
      diagnostics.push({
        category: 'viewer',
        severity: d.severity,
        code: d.code,
        message: d.message,
      })
    }

    const pages = plan.pages.map(p => ({
      index: p.index,
      width: p.width,
      height: p.height,
      elementCount: p.elements.length,
    }))

    return { pages, thumbnails: [], diagnostics }
  }

  async print(): Promise<void> {
    this.ensureNotDestroyed()
    if (!this._schema)
      throw new Error('No schema loaded')

    if (this._printAdapters.length > 0) {
      const adapter = this._printAdapters[0]!
      await adapter.print({
        schema: this._schema,
        data: this._data,
        dataSources: this._dataSources,
        entry: 'preview',
      })
      return
    }

    // Default: use window.print
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  async exportDocument(format?: string): Promise<Blob | void> {
    this.ensureNotDestroyed()
    if (!this._schema)
      throw new Error('No schema loaded')

    const adapter = format
      ? this._exportAdapters.find(a => a.format === format)
      : this._exportAdapters[0]

    if (!adapter) {
      this.emitDiagnostic({
        category: 'export-adapter',
        severity: 'error',
        code: 'NO_EXPORT_ADAPTER',
        message: `No export adapter found for format: ${format || 'default'}`,
      })
      return
    }

    const context = {
      schema: this._schema,
      data: this._data,
      dataSources: this._dataSources,
      entry: 'api' as const,
    }

    if (adapter.prepare) {
      await adapter.prepare(context)
    }

    return adapter.export(context)
  }

  registerExportAdapter(adapter: ExportAdapter): void {
    this._exportAdapters.push(adapter)
  }

  registerPrintAdapter(adapter: PrintAdapter): void {
    this._printAdapters.push(adapter)
  }

  get schema(): DocumentSchema | undefined {
    return this._schema
  }

  get data(): Record<string, unknown> {
    return this._data
  }

  destroy(): void {
    this._destroyed = true
    this._schema = undefined
    this._data = {}
    this._dataSources = []
    this._registry.clear()
    this._exportAdapters = []
    this._printAdapters = []
  }

  private ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('ViewerRuntime has been destroyed')
    }
  }

  private emitDiagnostic(event: ViewerDiagnosticEvent): void {
    this._diagnosticHandler?.(event)
  }
}
