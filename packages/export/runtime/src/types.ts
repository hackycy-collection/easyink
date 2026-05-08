import type { DiagnosticSeverity, ExportEntry, ExportFormat, ExportPhase } from '@easyink/shared'

export interface ExportDispatchState {
  phase: ExportPhase
  entry: ExportEntry
  format?: string
  error?: string
}

export interface ExportDiagnostic {
  severity: DiagnosticSeverity
  code: string
  message: string
  scope?: 'export-runtime' | 'export-adapter' | 'asset'
  detail?: unknown
  cause?: unknown
}

export interface ExportProgress {
  current?: number
  total?: number
  message?: string
}

export interface ExportRuntimeContext<TInput = unknown> {
  input: TInput
  entry: ExportEntry
  format: ExportFormat
  reportProgress: (progress: ExportProgress) => void
  emitDiagnostic: (diagnostic: ExportDiagnostic) => void
}

export interface ExportRuntimeAdapter<TInput = unknown, TResult extends Blob | void = Blob | void> {
  id: string
  format: ExportFormat
  validateInput?: (input: unknown) => input is TInput
  prepare?: (context: ExportRuntimeContext<TInput>) => Promise<void>
  export: (context: ExportRuntimeContext<TInput>) => Promise<TResult>
}

export interface ExportRuntimeOptions {
  entry?: ExportEntry
  onDiagnostic?: (diagnostic: ExportDiagnostic) => void
  onProgress?: (progress: ExportProgress) => void
}

export interface ExportDocumentOptions<TInput = unknown> extends ExportRuntimeOptions {
  format: ExportFormat
  input: TInput
  adapterId?: string
  throwOnError?: boolean
}

export type ExportStateListener = (state: ExportDispatchState) => void
