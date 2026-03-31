export { registerBuiltinRenderers } from './dom/builtins'

// Material Renderers
export {
  renderBarcode,
  renderDataTable,
  renderImage,
  renderLine,
  renderRect,
  renderTable,
  renderText,
} from './dom/elements/index'
export { buildPage } from './dom/page-builder'
export type { PageBuildResult } from './dom/page-builder'
// ─── DOM Renderer ───
export { DOMRenderer } from './dom/renderer'
export { MaterialRendererRegistry } from './dom/renderer-registry'
export { applyLayout, applyStyle } from './dom/style-applier'

// ─── Screen Renderer ───
export { ScreenRenderer } from './screen'

// ─── Types ───
export type {
  DOMRendererOptions,
  MaterialRenderContext,
  MaterialRenderFunction,
  Renderer,
  RenderResult,
  ScreenRendererOptions,
} from './types'
