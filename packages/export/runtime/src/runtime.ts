import type {
  ExportDiagnostic,
  ExportDispatchState,
  ExportDocumentOptions,
  ExportFormatPlugin,
  ExportRuntimeContext,
  ExportRuntimeOptions,
  ExportStateListener,
} from './types'

export class ExportRuntime {
  private plugins: ExportFormatPlugin[] = []
  private listeners = new Set<ExportStateListener>()
  private state: ExportDispatchState = {
    phase: 'idle',
    entry: 'api',
  }

  constructor(private readonly options: ExportRuntimeOptions = {}) {}

  registerPlugin<TInput = unknown, TResult extends Blob | void = Blob | void>(plugin: ExportFormatPlugin<TInput, TResult>): void {
    const normalizedPlugin = plugin as ExportFormatPlugin
    const index = this.plugins.findIndex(item => item.id === normalizedPlugin.id)
    if (index >= 0)
      this.plugins[index] = normalizedPlugin
    else
      this.plugins.push(normalizedPlugin)
  }

  getState(): ExportDispatchState {
    return { ...this.state }
  }

  subscribe(listener: ExportStateListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  async exportDocument<TInput = unknown>(options: ExportDocumentOptions<TInput>): Promise<Blob | void> {
    const entry = options.entry ?? this.options.entry ?? 'api'
    this.setState({ phase: 'dispatching', entry, format: options.format, error: undefined })

    const pluginCandidates = this.resolvePluginCandidates(options)
    let plugin: ExportFormatPlugin | undefined
    try {
      plugin = this.resolveValidPlugin(pluginCandidates, options.input)
    }
    catch (err) {
      this.fail(entry, options.format, err, options, 'EXPORT_INPUT_VALIDATOR_ERROR')
      if (options.throwOnError)
        throw err
      return undefined
    }
    if (!plugin) {
      const error = pluginCandidates.length === 0
        ? new Error(`No export plugin found for format: ${options.format}`)
        : new Error(`Export input does not match any export plugin for format: ${options.format}`)
      this.fail(
        entry,
        options.format,
        error,
        options,
        pluginCandidates.length === 0 ? 'NO_EXPORT_PLUGIN' : 'EXPORT_INPUT_INVALID',
      )
      if (options.throwOnError)
        throw error
      return undefined
    }

    const context: ExportRuntimeContext = {
      input: options.input,
      entry,
      format: options.format,
      reportProgress: (progress) => {
        this.options.onProgress?.(progress)
        options.onProgress?.(progress)
      },
      emitDiagnostic: (diagnostic) => {
        this.options.onDiagnostic?.(diagnostic)
        options.onDiagnostic?.(diagnostic)
      },
    }

    try {
      if (plugin.prepare) {
        this.setState({ phase: 'preparing', entry, format: options.format, error: undefined })
        await plugin.prepare(context)
      }

      this.setState({ phase: 'exporting', entry, format: options.format, error: undefined })
      const result = await plugin.export(context)
      this.setState({ phase: 'completed', entry, format: options.format, error: undefined })
      return result
    }
    catch (err) {
      this.fail(entry, options.format, err, options)
      if (options.throwOnError)
        throw err
      return undefined
    }
  }

  private resolvePluginCandidates<TInput>(options: ExportDocumentOptions<TInput>): ExportFormatPlugin[] {
    if (options.pluginId)
      return this.plugins.filter(plugin => plugin.id === options.pluginId && plugin.format === options.format)
    return this.plugins.filter(plugin => plugin.format === options.format)
  }

  private resolveValidPlugin(pluginCandidates: ExportFormatPlugin[], input: unknown): ExportFormatPlugin | undefined {
    return pluginCandidates.find(candidate => !candidate.validateInput || candidate.validateInput(input))
  }

  private fail(
    entry: ExportDispatchState['entry'],
    format: string,
    err: unknown,
    options: Pick<ExportDocumentOptions, 'onDiagnostic'>,
    code = 'EXPORT_RUNTIME_ERROR',
  ): void {
    const message = err instanceof Error ? err.message : String(err)
    const diagnostic: ExportDiagnostic = {
      severity: 'error',
      code,
      message,
      scope: 'export-runtime',
      cause: serializeCause(err),
    }
    this.options.onDiagnostic?.(diagnostic)
    options.onDiagnostic?.(diagnostic)
    this.setState({ phase: 'failed', entry, format, error: message })
  }

  private setState(next: ExportDispatchState): void {
    this.state = { ...next }
    const snapshot = this.getState()
    for (const listener of this.listeners)
      listener(snapshot)
  }
}

export function createExportRuntime(options?: ExportRuntimeOptions): ExportRuntime {
  return new ExportRuntime(options)
}

function serializeCause(err: unknown): unknown {
  if (err instanceof Error)
    return { name: err.name, message: err.message, stack: err.stack }
  return err
}
