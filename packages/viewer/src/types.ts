import type { DataSourceDescriptor } from '@easyink/datasource'
import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { DiagnosticCategory, DiagnosticSeverity, ExportEntry, ExportFormat, ExportPhase } from '@easyink/shared'

export interface ViewerOptions {
  mode?: 'fixed' | 'stack' | 'label'
  container?: HTMLElement
}

export interface ViewerOpenInput {
  schema: DocumentSchema
  data?: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
  onDiagnostic?: (event: ViewerDiagnosticEvent) => void
}

export interface ViewerDiagnosticEvent {
  category: DiagnosticCategory
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  detail?: unknown
}

export interface ViewerRenderResult {
  pages: ViewerPageResult[]
  thumbnails: ThumbnailResult[]
  diagnostics: ViewerDiagnosticEvent[]
}

export interface ViewerPageResult {
  index: number
  width: number
  height: number
  elementCount: number
}

export interface ThumbnailResult {
  pageIndex: number
  dataUrl?: string
}

export interface ExportAdapter {
  id: string
  format: ExportFormat
  prepare?: (context: ViewerExportContext) => Promise<void>
  export: (context: ViewerExportContext) => Promise<Blob | void>
}

export interface ViewerExportContext {
  schema: DocumentSchema
  data?: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
  entry: ExportEntry
}

export interface ExportDispatchState {
  phase: ExportPhase
  entry: ExportEntry
  format?: string
  error?: string
}

export interface PrintAdapter {
  id: string
  print: (context: ViewerExportContext) => Promise<void>
}

export interface MaterialViewerExtension {
  render: (node: MaterialNode, context: ViewerRenderContext) => ViewerRenderOutput
  measure?: (node: MaterialNode, context: ViewerMeasureContext) => ViewerMeasureResult
}

export interface ViewerRenderContext {
  data: Record<string, unknown>
  pageIndex: number
  unit: string
  zoom: number
}

export interface ViewerRenderOutput {
  html?: string
  element?: HTMLElement
}

export interface ViewerMeasureContext {
  data: Record<string, unknown>
  unit: string
}

export interface ViewerMeasureResult {
  width: number
  height: number
  overflow?: boolean
}
