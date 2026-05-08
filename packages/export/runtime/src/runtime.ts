import type {
  ExportDiagnostic,
  ExportDispatchState,
  ExportDocumentOptions,
  ExportRuntimeAdapter,
  ExportRuntimeContext,
  ExportRuntimeOptions,
  ExportStateListener,
} from './types'

export class ExportRuntime {
  private adapters: ExportRuntimeAdapter[] = []
  private listeners = new Set<ExportStateListener>()
  private state: ExportDispatchState = {
    phase: 'idle',
    entry: 'api',
  }

  constructor(private readonly options: ExportRuntimeOptions = {}) {}

  registerAdapter<TInput = unknown, TResult extends Blob | void = Blob | void>(adapter: ExportRuntimeAdapter<TInput, TResult>): void {
    const normalizedAdapter = adapter as ExportRuntimeAdapter
    const index = this.adapters.findIndex(item => item.id === normalizedAdapter.id)
    if (index >= 0)
      this.adapters[index] = normalizedAdapter
    else
      this.adapters.push(normalizedAdapter)
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

    const adapterCandidates = this.resolveAdapterCandidates(options)
    let adapter: ExportRuntimeAdapter | undefined
    try {
      adapter = this.resolveValidAdapter(adapterCandidates, options.input)
    }
    catch (err) {
      this.fail(entry, options.format, err, options, 'EXPORT_INPUT_VALIDATOR_ERROR')
      if (options.throwOnError)
        throw err
      return undefined
    }
    if (!adapter) {
      const error = adapterCandidates.length === 0
        ? new Error(`No export adapter found for format: ${options.format}`)
        : new Error(`Export input does not match any adapter for format: ${options.format}`)
      this.fail(
        entry,
        options.format,
        error,
        options,
        adapterCandidates.length === 0 ? 'NO_EXPORT_ADAPTER' : 'EXPORT_INPUT_INVALID',
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
      if (adapter.prepare) {
        this.setState({ phase: 'preparing', entry, format: options.format, error: undefined })
        await adapter.prepare(context)
      }

      this.setState({ phase: 'exporting', entry, format: options.format, error: undefined })
      const result = await adapter.export(context)
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

  private resolveAdapterCandidates<TInput>(options: ExportDocumentOptions<TInput>): ExportRuntimeAdapter[] {
    if (options.adapterId)
      return this.adapters.filter(adapter => adapter.id === options.adapterId && adapter.format === options.format)
    return this.adapters.filter(adapter => adapter.format === options.format)
  }

  private resolveValidAdapter(adapterCandidates: ExportRuntimeAdapter[], input: unknown): ExportRuntimeAdapter | undefined {
    return adapterCandidates.find(candidate => !candidate.validateInput || candidate.validateInput(input))
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
