import type { PagePlanEntry } from '@easyink/core'
import type { MaterialNode, PageBackground, PageSchema } from '@easyink/schema'
import type { MaterialRendererRegistry } from './material-registry'
import type { ViewerDiagnosticEvent, ViewerRenderContext } from './types'
import { getLineThickness, LINE_TYPE } from '@easyink/material-line'
import { isTableNode } from '@easyink/schema'
import { UNIT_FACTOR } from '@easyink/shared'

export interface RenderSurfaceOptions {
  container: HTMLElement
  zoom: number
  unit: string
  data: Record<string, unknown>
  resolvedPropsMap: Map<string, Record<string, unknown>>
  pageSchema: PageSchema
}

export interface PageDOM {
  pageIndex: number
  element: HTMLElement
}

/**
 * Render all pages into the container element.
 * Each page becomes a positioned div with child element wrappers inside.
 */
export function renderPages(
  pages: PagePlanEntry[],
  registry: MaterialRendererRegistry,
  options: RenderSurfaceOptions,
  diagnostics: ViewerDiagnosticEvent[],
): PageDOM[] {
  const { container, zoom, unit, data, resolvedPropsMap, pageSchema } = options
  container.innerHTML = ''

  const pxFactor = getPxFactor(unit)
  const pageDOMs: PageDOM[] = []

  for (const page of pages) {
    const pageEl = createPageElement(page, pageSchema, pxFactor, zoom)

    const context: ViewerRenderContext = {
      data,
      resolvedProps: {},
      pageIndex: page.index,
      unit,
      zoom,
    }

    // Sort elements by zIndex for proper layering
    const sorted = [...page.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

    for (const node of sorted) {
      if (node.hidden)
        continue

      const resolved = resolvedPropsMap.get(node.id) ?? node.props
      context.resolvedProps = resolved

      // Render through the material registry
      const nodeForRender: MaterialNode = { ...node, props: resolved }
      let output
      try {
        output = registry.render(nodeForRender, context)
      }
      catch (err) {
        diagnostics.push({
          category: 'material',
          severity: 'error',
          code: 'MATERIAL_RENDER_ERROR',
          message: `Failed to render ${node.type} (${node.id}): ${err instanceof Error ? err.message : String(err)}`,
          nodeId: node.id,
        })
        output = { html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff3f3;border:1px dashed #ff4d4f;color:#ff4d4f;font-size:11px;box-sizing:border-box;">[Render Error]</div>` }
      }

      const wrapper = createElementWrapper(node, page, pxFactor, zoom)
      if (output.element) {
        wrapper.appendChild(output.element)
      }
      else if (output.html) {
        wrapper.innerHTML = output.html
      }

      pageEl.appendChild(wrapper)
    }

    container.appendChild(pageEl)
    pageDOMs.push({ pageIndex: page.index, element: pageEl })
  }

  return pageDOMs
}

function createPageElement(page: PagePlanEntry, pageSchema: PageSchema, pxFactor: number, zoom: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'ei-viewer-page'
  el.setAttribute('data-page-index', String(page.index))
  el.style.position = 'relative'
  el.style.width = `${page.width * pxFactor * zoom}px`
  el.style.height = `${page.height * pxFactor * zoom}px`
  el.style.overflow = 'hidden'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'
  el.style.margin = '0 auto 16px auto'
  el.style.boxSizing = 'border-box'

  // Background
  applyPageBackground(el, pageSchema.background, pxFactor, zoom)

  // Border radius
  if (pageSchema.radius) {
    el.style.borderRadius = pageSchema.radius
  }

  return el
}

function applyPageBackground(el: HTMLElement, bg: PageBackground | undefined, pxFactor: number, zoom: number): void {
  if (!bg) {
    el.style.background = 'white'
    return
  }

  // Background color
  el.style.backgroundColor = bg.color || 'white'

  // Background image
  if (bg.image) {
    el.style.backgroundImage = `url(${bg.image})`

    // Repeat mode → CSS background-repeat + background-size
    const repeat = bg.repeat || 'none'
    if (repeat === 'full') {
      el.style.backgroundSize = '100% 100%'
      el.style.backgroundRepeat = 'no-repeat'
    }
    else {
      if (repeat === 'repeat') {
        el.style.backgroundRepeat = 'repeat'
      }
      else if (repeat === 'repeat-x') {
        el.style.backgroundRepeat = 'repeat-x'
      }
      else if (repeat === 'repeat-y') {
        el.style.backgroundRepeat = 'repeat-y'
      }
      else {
        el.style.backgroundRepeat = 'no-repeat'
      }

      // Explicit image dimensions
      if (bg.width != null && bg.height != null) {
        el.style.backgroundSize = `${bg.width * pxFactor * zoom}px ${bg.height * pxFactor * zoom}px`
      }
      else if (bg.width != null) {
        el.style.backgroundSize = `${bg.width * pxFactor * zoom}px auto`
      }
      else if (bg.height != null) {
        el.style.backgroundSize = `auto ${bg.height * pxFactor * zoom}px`
      }
    }

    // Background position offset
    if (bg.offsetX != null || bg.offsetY != null) {
      const x = (bg.offsetX ?? 0) * pxFactor * zoom
      const y = (bg.offsetY ?? 0) * pxFactor * zoom
      el.style.backgroundPosition = `${x}px ${y}px`
    }
  }
}

function createElementWrapper(
  node: MaterialNode,
  page: PagePlanEntry,
  pxFactor: number,
  zoom: number,
): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'ei-viewer-element'
  wrapper.setAttribute('data-element-id', node.id)
  wrapper.setAttribute('data-element-type', node.type)

  // Compute position relative to page
  const relativeY = node.y - page.yOffset

  wrapper.style.position = 'absolute'
  wrapper.style.left = `${node.x * pxFactor * zoom}px`
  wrapper.style.top = `${relativeY * pxFactor * zoom}px`
  wrapper.style.width = `${node.width * pxFactor * zoom}px`
  const renderHeight = node.type === LINE_TYPE ? getLineThickness(node) : node.height
  wrapper.style.height = `${renderHeight * pxFactor * zoom}px`
  // Tables use border-collapse:collapse where outer borders overflow by half
  // the border width. Use overflow:visible to avoid clipping bottom/right borders.
  // Page-level overflow:hidden still prevents content from escaping the page.
  wrapper.style.overflow = isTableNode(node) ? 'visible' : 'hidden'

  if (node.rotation) {
    wrapper.style.transform = `rotate(${node.rotation}deg)`
    wrapper.style.transformOrigin = 'center center'
  }

  if (node.alpha != null && node.alpha !== 1) {
    wrapper.style.opacity = String(node.alpha)
  }

  return wrapper
}

/**
 * CSS pixels per document unit.
 * CSS reference: 96 dpi.
 */
function getPxFactor(unit: string): number {
  const factor = UNIT_FACTOR[unit]
  if (!factor)
    return 1
  return 96 / factor
}
