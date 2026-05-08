import type { InternalHooks, PagePlan } from '@easyink/core'
import type { DocumentSchema } from '@easyink/schema'
import type {
  ExportAdapter,
  MaterialViewerExtension,
  PrintAdapter,
  ViewerDiagnosticEvent,
  ViewerExportOptions,
  ViewerMeasureContext,
  ViewerOpenInput,
  ViewerOptions,
  ViewerPageMetrics,
  ViewerPrintOptions,
  ViewerPrintPolicy,
  ViewerRenderResult,
} from './types'
import type { ViewerHostAdapter } from './viewer-host'
import { registerBuiltinViewerMaterials } from '@easyink/builtin'
import { createInternalHooks, createPagePlan, FontManager } from '@easyink/core'
import { traverseNodes, validateSchema } from '@easyink/schema'
import { UNIT_FACTOR } from '@easyink/shared'
import { applyBindingsToProps, projectBindings } from './binding-projector'
import { resolveViewerDataContext } from './data-source-resolver'
import { collectFontFamilies, loadAndInjectFonts } from './font-loader'
import { MaterialRendererRegistry } from './material-registry'
import { PrintPolicyError, resolvePrintPolicy } from './print-policy'
import { renderPages } from './render-surface'
import { applyStackFlowLayout } from './stack-flow-layout'
import { createThumbnails } from './thumbnail-pipeline'
import { createBrowserViewerHost, createIframeViewerHost } from './viewer-host'

export class ViewerRuntime {
  private _options: ViewerOptions
  private _schema?: DocumentSchema
  private _data: Record<string, unknown> = {}
  private _dataSources: ViewerOpenInput['dataSources'] = []
  private _diagnosticHandler?: (event: ViewerDiagnosticEvent) => void
  private _exportAdapters: ExportAdapter[] = []
  private _printAdapters: PrintAdapter[] = []
  private _materialRegistry = new MaterialRendererRegistry()
  private _fontManager: FontManager
  private _hooks: InternalHooks
  private _host?: ViewerHostAdapter
  private _renderedPageMetrics: ViewerPageMetrics[] = []
  private _destroyed = false
  private _emittingHookFailure = false

  constructor(options: ViewerOptions = {}) {
    this._options = options
    this._host = options.host
      ?? (options.iframe
        ? createIframeViewerHost(options.iframe)
        : options.container
          ? createBrowserViewerHost(options.container)
          : undefined)
    this._fontManager = new FontManager(options.fontProvider)
    this._hooks = createInternalHooks()
    registerBuiltinViewerMaterials((type, extension) => {
      this.registerMaterial(type, extension)
    })
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async open(input: ViewerOpenInput): Promise<void> {
    this.ensureNotDestroyed()
    this._diagnosticHandler = input.onDiagnostic

    // 1. Validate schema
    const errors = validateSchema(input.schema)
    if (errors.length > 0) {
      const event: ViewerDiagnosticEvent = {
        category: 'schema',
        severity: 'error',
        code: 'INVALID_SCHEMA',
        message: errors.join('; '),
        scope: 'schema',
      }
      this.emitDiagnostic(event)
      throw new Error(`Invalid schema: ${errors.join('; ')}`)
    }

    // 2. Hook: beforeSchemaNormalize
    const normalizedSchema = this.callSchemaNormalizeHook(input.schema)
    this._schema = normalizedSchema

    const dataResolution = resolveViewerDataContext({ data: input.data, dataSources: input.dataSources })
    this._data = dataResolution.data
    this._dataSources = input.dataSources ?? []
    for (const diagnostic of dataResolution.diagnostics)
      this.emitDiagnostic(diagnostic)

    // 3. Render (font loading + binding + page plan + DOM)
    if (this._host) {
      await this.render()
    }
  }

  async updateData(data: Record<string, unknown>): Promise<void> {
    this.ensureNotDestroyed()
    const dataResolution = resolveViewerDataContext({ data, dataSources: this._dataSources })
    this._data = dataResolution.data
    for (const diagnostic of dataResolution.diagnostics)
      this.emitDiagnostic(diagnostic)
    if (this._host && this._schema) {
      await this.render()
    }
  }

  async render(): Promise<ViewerRenderResult> {
    this.ensureNotDestroyed()
    if (!this._schema) {
      throw new Error('No schema loaded. Call open() first.')
    }

    const diagnostics: ViewerDiagnosticEvent[] = []

    // Stage 1: Font loading
    await this.loadFonts(diagnostics)

    // Stage 2: Binding projection
    const resolvedPropsMap = this.resolveAllBindings(diagnostics)

    // Stage 3: Hook - beforePagePlan
    try {
      this._hooks.beforePagePlan.call({ schema: this._schema, mode: this._schema.page.mode })
    }
    catch (err) {
      const diagnostic: ViewerDiagnosticEvent = {
        category: 'viewer',
        severity: 'error',
        code: 'BEFORE_PAGE_PLAN_HOOK_ERROR',
        message: `beforePagePlan hook failed: ${err instanceof Error ? err.message : String(err)}`,
        scope: 'hook',
        cause: serializeCause(err),
      }
      diagnostics.push(diagnostic)
      this.emitDiagnostic(diagnostic)
      throw err
    }

    // Stage 3.5: Measure elements that need expansion (e.g., table-data)
    const { schema: measuredSchema, diagnostics: layoutDiagnostics } = this.applyMeasureAndLayout()
    diagnostics.push(...layoutDiagnostics)

    // Stage 4: Page planning
    const plan = createPagePlan(measuredSchema, { originalSchema: this._schema })

    for (const d of plan.diagnostics) {
      diagnostics.push({
        category: 'viewer',
        severity: d.severity,
        code: d.code,
        message: d.message,
      })
    }

    // Stage 4.5: Resolve page-aware elements (e.g., page-number)
    this.resolvePageAwareElements(plan, resolvedPropsMap)

    // Stage 5: DOM rendering
    const pages = plan.pages.map(p => ({
      index: p.index,
      width: p.width,
      height: p.height,
      elementCount: p.elements.length,
      element: undefined as HTMLElement | undefined,
    }))
    this._renderedPageMetrics = pages.map(page => ({
      index: page.index,
      width: page.width,
      height: page.height,
      unit: this._schema!.unit,
    }))

    if (this._host) {
      const pageDOMs = renderPages(
        plan.pages,
        this._materialRegistry,
        {
          container: this._host.mount,
          document: this._host.document,
          zoom: this.resolveZoom(),
          unit: this._schema.unit,
          data: this._data,
          resolvedPropsMap,
          pageSchema: this._schema.page,
        },
        diagnostics,
      )

      for (const dom of pageDOMs) {
        const page = pages.find(p => p.index === dom.pageIndex)
        if (page) {
          page.element = dom.element
        }
      }

      // Apply page-level viewport offset (preview only, not print)
      this.applyViewportOffset(this._host.mount)
    }

    // Emit all diagnostics
    for (const d of diagnostics) {
      this.emitDiagnostic(d)
    }

    return { pages, thumbnails: createThumbnails(pages, this._schema.unit), diagnostics }
  }

  async print(options: ViewerPrintOptions = {}): Promise<void> {
    this.ensureNotDestroyed()
    if (!this._schema)
      throw new Error('No schema loaded')

    const printPolicy = this.createPrintPolicy(options)
    if (!printPolicy)
      return

    const shouldUseBrowser = !options.adapterId || options.adapterId === 'browser'
    if (!shouldUseBrowser) {
      const adapter = this._printAdapters.find(item => item.id === options.adapterId)
      if (!adapter) {
        const err = new Error(`No print adapter found for id: ${options.adapterId}`)
        this.emitPrintError(err, options.onDiagnostic, 'NO_PRINT_ADAPTER')
        if (options.throwOnError)
          throw err
        return
      }

      try {
        options.onPhase?.({ phase: 'preparing', message: adapter.id })
        await adapter.print({
          schema: this._schema,
          data: this._data,
          dataSources: this._dataSources,
          entry: 'preview',
          printPolicy,
          renderedPages: this.renderedPages,
          container: this._host?.mount,
          onPhase: options.onPhase,
          onProgress: options.onProgress,
          onDiagnostic: event => this.emitTaskDiagnostic(event, options.onDiagnostic),
        })
        options.onPhase?.({ phase: 'completed', message: adapter.id })
      }
      catch (err) {
        this.emitPrintError(err, options.onDiagnostic)
        if (options.throwOnError)
          throw err
      }
      return
    }

    // Fallback: window.print with DOM isolation
    const fallbackWindow = this._host?.window ?? getGlobalWindow()
    if (fallbackWindow) {
      if (this._host) {
        await this.printWithIsolation(printPolicy)
      }
      else {
        try {
          fallbackWindow.print()
        }
        catch (err) {
          this.emitPrintError(err, options.onDiagnostic)
          if (options.throwOnError)
            throw err
        }
      }
    }
  }

  private createPrintPolicy(options: ViewerPrintOptions = {}): ViewerPrintPolicy | undefined {
    try {
      return resolvePrintPolicy({
        schema: this._schema!,
        options,
        renderedPages: this._renderedPageMetrics,
      })
    }
    catch (err) {
      this.emitPrintError(err, options.onDiagnostic)
      if (options.throwOnError)
        throw err
      return undefined
    }
  }

  private async printWithIsolation(printPolicy: ViewerPrintPolicy): Promise<void> {
    const host = this._host!
    const container = host.mount
    const doc = container.ownerDocument
    const ancestors: HTMLElement[] = []
    let removeStyle: (() => void) | undefined

    try {
      let el: HTMLElement | null = container.parentElement
      while (el) {
        el.setAttribute('data-ei-print-ancestor', '')
        ancestors.push(el)
        if (el === doc.body)
          break
        el = el.parentElement
      }
      container.setAttribute('data-ei-printing', '')

      removeStyle = host.appendStyle(this.buildPrintStyles(printPolicy))

      host.print()
    }
    catch (err) {
      this.emitPrintError(err)
    }
    finally {
      removeStyle?.()
      container.removeAttribute('data-ei-printing')
      for (const ancestor of ancestors) {
        ancestor.removeAttribute('data-ei-print-ancestor')
      }
    }
  }

  private emitPrintError(
    err: unknown,
    onDiagnostic?: (event: ViewerDiagnosticEvent) => void,
    code?: string,
  ): void {
    const cause = err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : err
    this.emitTaskDiagnostic({
      category: 'print',
      severity: 'error',
      code: code ?? (err instanceof PrintPolicyError ? err.code : 'PRINT_ERROR'),
      message: err instanceof PrintPolicyError
        ? err.message
        : `Print failed: ${err instanceof Error ? err.message : String(err)}`,
      scope: 'print',
      cause,
    }, onDiagnostic)
  }

  private buildPrintStyles(printPolicy: ViewerPrintPolicy): string {
    const pageSizeCSS = printPolicy.pageSizeMode === 'driver'
      ? ''
      : `    size: ${printPolicy.sheetSize!.width}${printPolicy.sheetSize!.unit} ${printPolicy.sheetSize!.height}${printPolicy.sheetSize!.unit};\n`
    const offset = printPolicy.offset
    const offsetCSS = (offset.horizontal !== 0 || offset.vertical !== 0)
      ? `transform: translate(${offset.horizontal}${offset.unit}, ${offset.vertical}${offset.unit}) !important;`
      : ''

    return `@media print {
  @page {
${pageSizeCSS}    margin: 0;
  }
  [data-ei-print-ancestor] {
    display: block !important;
    position: static !important;
    overflow: visible !important;
    visibility: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    background: none !important;
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    box-shadow: none !important;
    opacity: 1 !important;
    transform: none !important;
    z-index: auto !important;
    inset: auto !important;
    flex: none !important;
  }
  [data-ei-print-ancestor] > *:not([data-ei-print-ancestor]):not([data-ei-printing]) {
    display: none !important;
  }
  [data-ei-printing] {
    display: block !important;
    position: static !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    background: none !important;
    border: none !important;
    box-shadow: none !important;
  }
  .ei-viewer-page-zoom {
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
  }
  .ei-viewer-page {
    box-shadow: none !important;
    margin: 0 !important;
    transform: none !important;
    break-after: ${printPolicy.pageBreakBehavior.after};
    break-inside: ${printPolicy.pageBreakBehavior.inside};
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    ${offsetCSS}
  }
  .ei-viewer-page:last-child {
    break-after: auto;
  }
}`
  }

  async exportDocument(formatOrOptions?: string | ViewerExportOptions): Promise<Blob | void> {
    this.ensureNotDestroyed()
    if (!this._schema)
      throw new Error('No schema loaded')

    const options = typeof formatOrOptions === 'string'
      ? { format: formatOrOptions }
      : (formatOrOptions ?? {})
    const format = options.format

    const adapter = format
      ? this._exportAdapters.find(a => a.format === format)
      : this._exportAdapters[0]

    if (!adapter) {
      const err = new Error(`No export adapter found for format: ${format || 'default'}`)
      this.emitTaskDiagnostic({
        category: 'export-adapter',
        severity: 'error',
        code: 'NO_EXPORT_ADAPTER',
        message: err.message,
        scope: 'export-adapter',
        cause: serializeCause(err),
      }, options.onDiagnostic)
      if (options.throwOnError)
        throw err
      return
    }

    const context = {
      schema: this._schema,
      data: this._data,
      dataSources: this._dataSources,
      entry: options.entry ?? 'api' as const,
      renderedPages: this.renderedPages,
      container: this._host?.mount,
      onPhase: options.onPhase,
      onProgress: options.onProgress,
      onDiagnostic: (event: ViewerDiagnosticEvent) => this.emitTaskDiagnostic(event, options.onDiagnostic),
    }

    try {
      if (adapter.prepare) {
        options.onPhase?.({ phase: 'preparing', message: adapter.id })
        await adapter.prepare(context)
      }

      options.onPhase?.({ phase: 'exporting', message: adapter.id })
      const result = await adapter.export(context)
      options.onPhase?.({ phase: 'completed', message: adapter.id })
      return result
    }
    catch (err) {
      this.emitExportError(adapter.id, format, err, options.onDiagnostic)
      if (options.throwOnError)
        throw err
      return undefined
    }
  }

  destroy(): void {
    this._destroyed = true
    this._schema = undefined
    this._data = {}
    this._materialRegistry.clear()
    this._exportAdapters = []
    this._printAdapters = []
    this._renderedPageMetrics = []
    this._fontManager.clear()
    this._host?.clear()
  }

  // ---------------------------------------------------------------------------
  // Registration API
  // ---------------------------------------------------------------------------

  registerMaterial(type: string, extension: MaterialViewerExtension): void {
    this._materialRegistry.register(type, extension)
  }

  registerExportAdapter(adapter: ExportAdapter): void {
    this._exportAdapters.push(adapter)
  }

  registerPrintAdapter(adapter: PrintAdapter): void {
    this._printAdapters.push(adapter)
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  get schema(): DocumentSchema | undefined {
    return this._schema
  }

  get data(): Record<string, unknown> {
    return this._data
  }

  get renderedPages(): ViewerPageMetrics[] {
    return this._renderedPageMetrics.map(page => ({ ...page }))
  }

  get hooks(): InternalHooks {
    return this._hooks
  }

  get fontManager(): FontManager {
    return this._fontManager
  }

  get materialRegistry(): MaterialRendererRegistry {
    return this._materialRegistry
  }

  // ---------------------------------------------------------------------------
  // Internal pipeline stages
  // ---------------------------------------------------------------------------

  /**
   * Stage 4.5: Resolve page-aware elements.
   * Collects elements whose material type is marked pageAware, removes them
   * from their original page, then replicates them into every page with
   * injected __pageNumber / __totalPages props.
   */
  private resolvePageAwareElements(
    plan: PagePlan,
    resolvedPropsMap: Map<string, Record<string, unknown>>,
  ): void {
    // Label mode does not support page-aware elements
    if (plan.mode === 'label')
      return

    // Collect page-aware elements across all pages
    const pageAwareElements: import('@easyink/schema').MaterialNode[] = []
    for (const page of plan.pages) {
      const kept: import('@easyink/schema').MaterialNode[] = []
      for (const el of page.elements) {
        if (this._materialRegistry.isPageAware(el.type)) {
          pageAwareElements.push(el)
        }
        else {
          kept.push(el)
        }
      }
      page.elements = kept
    }

    if (pageAwareElements.length === 0)
      return

    const totalPages = plan.pages.length

    // Replicate page-aware elements into every page
    for (const page of plan.pages) {
      for (const el of pageAwareElements) {
        const virtualId = `${el.id}__p${page.index}`
        const virtualNode = { ...el, id: virtualId }
        page.elements.push(virtualNode)

        // Inject page context into resolved props
        const baseProps = resolvedPropsMap.get(el.id) ?? el.props
        resolvedPropsMap.set(virtualId, {
          ...baseProps,
          __pageNumber: page.index + 1,
          __totalPages: totalPages,
        })
      }
    }
  }

  private applyMeasureAndLayout(): { schema: DocumentSchema, diagnostics: ViewerDiagnosticEvent[] } {
    if (!this._schema)
      return { schema: this._schema!, diagnostics: [] }

    let modified = false
    const diagnostics: ViewerDiagnosticEvent[] = []
    const measureCtx: ViewerMeasureContext = {
      data: this._data,
      unit: this._schema.unit,
      reportDiagnostic: diagnostic => diagnostics.push({
        category: 'datasource',
        severity: diagnostic.severity,
        code: diagnostic.code,
        message: diagnostic.message,
        nodeId: diagnostic.nodeId,
        scope: 'datasource',
        cause: diagnostic.cause,
      }),
    }

    let elements = this._schema.elements.map((node) => {
      let result
      try {
        result = this._materialRegistry.measure(node, measureCtx)
      }
      catch (err) {
        diagnostics.push({
          category: 'viewer',
          severity: 'warning',
          code: 'MATERIAL_MEASURE_ERROR',
          message: `Material measure failed for ${node.id}: ${err instanceof Error ? err.message : String(err)}`,
          nodeId: node.id,
          scope: 'material',
          cause: serializeCause(err),
        })
        return node
      }
      if (!result || (result.width === node.width && result.height === node.height))
        return node
      modified = true
      return { ...node, height: result.height, width: result.width }
    })

    if (this._schema.page.mode === 'stack') {
      const flowResult = applyStackFlowLayout(this._schema.elements, elements)
      elements = flowResult.elements
      diagnostics.push(...flowResult.diagnostics)
      if (!modified) {
        modified = elements.some((node, index) => {
          const original = this._schema!.elements[index]
          return !!original && (node.y !== original.y || node.height !== original.height || node.width !== original.width)
        })
      }
    }

    if (!modified)
      return { schema: this._schema, diagnostics }
    return { schema: { ...this._schema, elements }, diagnostics }
  }

  private async loadFonts(diagnostics: ViewerDiagnosticEvent[]): Promise<void> {
    if (!this._schema || !this._fontManager.provider)
      return

    const families = collectFontFamilies(this._schema)
    if (families.size === 0)
      return

    if (!this._host)
      return

    try {
      const fontDiags = await loadAndInjectFonts(families, this._fontManager, this._host.document)
      diagnostics.push(...fontDiags)
    }
    catch (err) {
      diagnostics.push({
        category: 'viewer',
        severity: 'warning',
        code: 'FONT_LOAD_ERROR',
        message: `Font loading failed: ${err instanceof Error ? err.message : String(err)}`,
        scope: 'font',
        cause: serializeCause(err),
      })
    }
  }

  private resolveAllBindings(diagnostics: ViewerDiagnosticEvent[]): Map<string, Record<string, unknown>> {
    const resolvedMap = new Map<string, Record<string, unknown>>()
    if (!this._schema)
      return resolvedMap

    traverseNodes(this._schema, (node) => {
      if (!node.binding) {
        resolvedMap.set(node.id, node.props)
        return
      }

      try {
        const projected = projectBindings(node, this._data, this._dataSources)
        for (const binding of projected) {
          for (const diagnostic of binding.diagnostics ?? []) {
            diagnostics.push({
              category: 'datasource',
              severity: diagnostic.severity,
              code: diagnostic.code,
              message: diagnostic.message,
              nodeId: node.id,
              scope: 'datasource',
              cause: diagnostic.cause,
            })
          }
        }
        const resolvedProps = applyBindingsToProps(node.props, projected, node.type)
        resolvedMap.set(node.id, resolvedProps)
      }
      catch (err) {
        const cause = err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : err
        diagnostics.push({
          category: 'datasource',
          severity: 'warning',
          code: 'BINDING_RESOLVE_ERROR',
          message: `Binding resolution failed for ${node.id}: ${err instanceof Error ? err.message : String(err)}`,
          nodeId: node.id,
          scope: 'datasource',
          cause,
        })
        resolvedMap.set(node.id, node.props)
      }
    })

    return resolvedMap
  }

  private ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('ViewerRuntime has been destroyed')
    }
  }

  private resolveZoom(): number {
    if (!this._schema)
      return 1

    const scale = this._schema.page.scale
    if (scale == null || scale === 'auto')
      return 1

    if (typeof scale === 'number')
      return scale

    const container = this._host?.mount
    if (!container)
      return 1

    const pxFactor = 96 / (UNIT_FACTOR[this._schema.unit] ?? 25.4)
    const pageWidthPx = this._schema.page.width * pxFactor
    const pageHeightPx = this._schema.page.height * pxFactor

    if (scale === 'fit-width' && pageWidthPx > 0) {
      return container.clientWidth / pageWidthPx
    }

    if (scale === 'fit-height' && pageHeightPx > 0) {
      return container.clientHeight / pageHeightPx
    }

    return 1
  }

  private applyViewportOffset(container: HTMLElement): void {
    if (!this._schema)
      return

    const ox = this._schema.page.offsetX ?? 0
    const oy = this._schema.page.offsetY ?? 0

    if (ox === 0 && oy === 0) {
      container.style.paddingLeft = ''
      container.style.paddingTop = ''
      return
    }

    const unit = this._schema.unit
    container.style.paddingLeft = `${ox}${unit}`
    container.style.paddingTop = `${oy}${unit}`
  }

  private emitDiagnostic(event: ViewerDiagnosticEvent): void {
    this._diagnosticHandler?.(event)
    this._hooks.diagnosticsEmitted.call(event).catch(() => {
      this.emitDiagnosticHookError()
    })
  }

  private emitTaskDiagnostic(
    event: ViewerDiagnosticEvent,
    onDiagnostic?: (event: ViewerDiagnosticEvent) => void,
  ): void {
    onDiagnostic?.(event)
    this.emitDiagnostic(event)
  }

  private callSchemaNormalizeHook(schema: DocumentSchema): DocumentSchema {
    try {
      return this._hooks.beforeSchemaNormalize.call(schema)
    }
    catch (err) {
      this.emitDiagnostic({
        category: 'viewer',
        severity: 'error',
        code: 'SCHEMA_NORMALIZE_HOOK_ERROR',
        message: `Schema normalize hook failed: ${err instanceof Error ? err.message : String(err)}`,
        scope: 'hook',
        cause: serializeCause(err),
      })
      throw err
    }
  }

  private emitExportError(
    adapterId: string,
    format: string | undefined,
    err: unknown,
    onDiagnostic?: (event: ViewerDiagnosticEvent) => void,
  ): void {
    this.emitTaskDiagnostic({
      category: 'export-adapter',
      severity: 'error',
      code: 'EXPORT_ADAPTER_ERROR',
      message: `Export adapter "${adapterId}" failed for format "${format || 'default'}": ${err instanceof Error ? err.message : String(err)}`,
      scope: 'export-adapter',
      cause: serializeCause(err),
    }, onDiagnostic)
  }

  private emitDiagnosticHookError(): void {
    if (this._emittingHookFailure)
      return
    this._emittingHookFailure = true
    try {
      this._diagnosticHandler?.({
        category: 'viewer',
        severity: 'warning',
        code: 'DIAGNOSTIC_HOOK_ERROR',
        message: 'diagnosticsEmitted hook failed',
        scope: 'hook',
      })
    }
    finally {
      this._emittingHookFailure = false
    }
  }
}

function getGlobalWindow(): Window | undefined {
  return typeof window === 'undefined' ? undefined : window
}

function serializeCause(err: unknown): unknown {
  if (err instanceof Error)
    return { name: err.name, message: err.message, stack: err.stack }
  return err
}
