import type { MaterialNode } from '@easyink/schema'

/**
 * Viewer render context passed to each material's render function.
 * Provides document-level unit and zoom for physical unit calculations.
 */
export interface ViewerRenderContext {
  data: Record<string, unknown>
  resolvedProps: Record<string, unknown>
  pageIndex: number
  /** Document unit: 'mm' | 'pt' | 'px'. CSS unit suffix equals this value. */
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

export interface MaterialViewerExtension {
  render: (node: MaterialNode, context: ViewerRenderContext) => ViewerRenderOutput
  measure?: (node: MaterialNode, context: ViewerMeasureContext) => ViewerMeasureResult
}
