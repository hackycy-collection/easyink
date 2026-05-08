import type { DocumentSchema, TableNode } from '@easyink/schema'
import type { ViewerRuntime } from './runtime'
import type { ViewerExportContext, ViewerPageMetrics, ViewerPrintContext, ViewerPrintOptions, ViewerPrintPolicy } from './types'
import { LINE_TYPE, renderLine } from '@easyink/material-line'
import { measureTableData, renderTableData, TABLE_DATA_TYPE } from '@easyink/material-table-data'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createViewer, resolvePrintPolicy } from './index'
import { buildPrintStyles } from './print-service'

function registerTestMaterials(viewer: ViewerRuntime): void {
  viewer.registerMaterial(LINE_TYPE, { render: (node, ctx) => renderLine(node, ctx) })
  viewer.registerMaterial(TABLE_DATA_TYPE, {
    render: (node, ctx) => renderTableData(node, ctx),
    measure: (node, ctx) => measureTableData(node, ctx),
  })
}

function createItemsTable(): TableNode {
  return {
    id: 'items',
    type: 'table-data',
    x: 5,
    y: 10,
    width: 70,
    height: 24,
    props: {},
    table: {
      kind: 'data',
      showHeader: true,
      showFooter: true,
      topology: {
        columns: [{ ratio: 0.5 }, { ratio: 0.5 }],
        rows: [
          {
            height: 8,
            role: 'header',
            cells: [{ content: { text: '名称' } }, { content: { text: '数量' } }],
          },
          {
            height: 8,
            role: 'repeat-template',
            cells: [
              { binding: { sourceId: 'invoice', fieldPath: 'items/name', fieldLabel: '名称' } },
              { binding: { sourceId: 'invoice', fieldPath: 'items/qty', fieldLabel: '数量' } },
            ],
          },
          {
            height: 8,
            role: 'footer',
            cells: [{ content: { text: '合计' } }, { content: { text: '3' } }],
          },
        ],
      },
      layout: {},
    } as TableNode['table'],
  }
}

function createStackSchema(pageHeight = 100): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: {
      mode: 'stack',
      width: 80,
      height: pageHeight,
    },
    guides: { x: [], y: [] },
    elements: [
      createItemsTable(),
      {
        id: 'after',
        type: 'line',
        x: 5,
        y: 62,
        width: 70,
        height: 8,
        props: {
          lineColor: '#000000',
          lineType: 'solid',
        },
      },
    ],
  }
}

function createFixedSchema(): DocumentSchema {
  return {
    version: '1.0.0',
    unit: 'mm',
    page: {
      mode: 'fixed',
      width: 80,
      height: 60,
    },
    guides: { x: [], y: [] },
    elements: [],
  }
}

function createData(): Record<string, unknown> {
  return {
    items: Array.from({ length: 10 }, (_, index) => ({ name: `Item ${index + 1}`, qty: index + 1 })),
  }
}

function getPrintPolicy(viewer: ViewerRuntime, options?: ViewerPrintOptions): ViewerPrintPolicy {
  const schema = viewer.schema
  expect(schema).toBeDefined()
  const policy = resolvePrintPolicy({ schema: schema!, options, renderedPages: viewer.renderedPages })
  expect(policy).toBeDefined()
  return policy
}

function getPrintStyles(viewer: ViewerRuntime, options?: ViewerPrintOptions): string {
  const policy = getPrintPolicy(viewer, options)
  return buildPrintStyles(policy)
}

function setRenderedPages(viewer: ViewerRuntime, pages: ViewerPageMetrics[]): void {
  const runtime = viewer as unknown as { _renderedPageMetrics: ViewerPageMetrics[] }
  runtime._renderedPageMetrics = pages
}

function mockWindowPrint(implementation: () => void = () => {}): ReturnType<typeof vi.fn> {
  const print = vi.fn(implementation)
  Object.defineProperty(window, 'print', {
    configurable: true,
    value: print,
  })
  return print
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'print')
  document.body.innerHTML = ''
})

describe('viewer runtime print policy', () => {
  it('defaults pageSizeMode to driver for stack-mode browser printing', () => {
    const policy = resolvePrintPolicy({ schema: createStackSchema() })

    expect(policy.pageSizeMode).toBe('driver')
    expect(policy.sheetSize).toBeUndefined()
    expect(policy.pageBreakBehavior).toEqual({ after: 'auto', inside: 'auto' })
  })

  it('does not force a fixed page size for stack-mode browser printing', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    registerTestMaterials(viewer)
    const pageHeight = 100

    await viewer.open({
      schema: createStackSchema(pageHeight),
      data: createData(),
    })

    const pageEl = container.querySelector('.ei-viewer-page') as HTMLElement | null
    expect(pageEl).not.toBeNull()
    expect(Number.parseFloat(pageEl!.style.height)).toBeGreaterThan(pageHeight)

    const printStyles = getPrintStyles(viewer)
    expect(printStyles).not.toContain('size: 80mm')
    expect(printStyles).toContain('break-after: auto;')
    expect(printStyles).toContain('break-inside: auto;')
  })

  it('uses cached rendered stack metrics when stack printing requests a fixed page size', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    registerTestMaterials(viewer)

    await viewer.open({
      schema: createStackSchema(),
      data: createData(),
    })

    const renderedPage = viewer.renderedPages[0]!
    const pageEl = container.querySelector('.ei-viewer-page') as HTMLElement | null
    expect(pageEl).not.toBeNull()
    pageEl!.style.height = '1mm'

    const printStyles = getPrintStyles(viewer, { pageSizeMode: 'fixed' })
    expect(printStyles).toContain(`size: ${renderedPage.width}${renderedPage.unit} ${renderedPage.height}${renderedPage.unit};`)
    expect(printStyles).not.toContain('size: 80mm 1mm;')
    expect(printStyles).toContain('break-after: auto;')
  })

  it('keeps fixed-page browser printing constrained to the template size', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })

    await viewer.open({ schema: createFixedSchema() })

    const printStyles = getPrintStyles(viewer)
    expect(printStyles).toContain('size: 80mm 60mm;')
    expect(printStyles).toContain('break-after: page;')
    expect(printStyles).toContain('break-inside: avoid;')
  })
})

describe('viewer runtime print behavior', () => {
  it('passes resolved print policy to print adapters', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    const printSpy = mockWindowPrint()
    const calls: ViewerPrintContext[] = []

    viewer.registerPrintAdapter({
      id: 'test-print-adapter',
      async print(context) {
        calls.push(context)
      },
    })

    await viewer.open({ schema: createFixedSchema() })
    await viewer.print({ adapterId: 'test-print-adapter', pageSizeMode: 'fixed' })

    expect(printSpy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.printPolicy.pageSizeMode).toBe('fixed')
    expect(calls[0]!.printPolicy.sheetSize).toMatchObject({ width: 80, height: 60, unit: 'mm' })
    expect(calls[0]!.renderedPages[0]).toMatchObject({ width: 80, height: 60, unit: 'mm' })
    expect(calls[0]!.container).toBe(container)
  })

  it('cleans print isolation state when window.print throws', async () => {
    const wrapper = document.createElement('section')
    const container = document.createElement('div')
    wrapper.appendChild(container)
    document.body.appendChild(wrapper)
    const diagnostics: string[] = []
    const viewer = createViewer({ container })
    const styleCountBefore = document.head.querySelectorAll('style').length
    mockWindowPrint(() => {
      throw new Error('print boom')
    })

    await viewer.open({
      schema: createFixedSchema(),
      onDiagnostic(event) {
        diagnostics.push(event.code)
      },
    })
    await viewer.print()

    expect(container.hasAttribute('data-ei-printing')).toBe(false)
    expect(wrapper.hasAttribute('data-ei-print-ancestor')).toBe(false)
    expect(document.body.hasAttribute('data-ei-print-ancestor')).toBe(false)
    expect(document.head.querySelectorAll('style')).toHaveLength(styleCountBefore)
    expect(diagnostics).toContain('PRINT_ERROR')
  })

  it('propagates isolated browser print failures to call diagnostics and throwOnError', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const viewer = createViewer({ container })
    const callbackDiagnostics: string[] = []
    mockWindowPrint(() => {
      throw new Error('print boom')
    })

    await viewer.open({ schema: createFixedSchema() })

    await expect(viewer.print({
      throwOnError: true,
      onDiagnostic(event) {
        callbackDiagnostics.push(event.code)
      },
    })).rejects.toThrow('print boom')

    expect(callbackDiagnostics).toContain('PRINT_ERROR')
    expect(container.hasAttribute('data-ei-printing')).toBe(false)
  })

  it('rejects stack pdf printing when rendered metrics are missing', async () => {
    const container = document.createElement('div')
    const diagnostics: string[] = []
    const viewer = createViewer({ container })
    registerTestMaterials(viewer)
    const printSpy = mockWindowPrint()

    await viewer.open({
      schema: createStackSchema(),
      data: createData(),
      onDiagnostic(event) {
        diagnostics.push(event.code)
      },
    })
    setRenderedPages(viewer, [])

    await viewer.print({ pageSizeMode: 'fixed' })

    expect(printSpy).not.toHaveBeenCalled()
    expect(container.hasAttribute('data-ei-printing')).toBe(false)
    expect(diagnostics).toContain('PRINT_RENDER_METRICS_MISSING')
  })

  it('uses browser printing by default even when adapters are registered', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    const printSpy = mockWindowPrint()
    const calls: ViewerPrintContext[] = []

    viewer.registerPrintAdapter({
      id: 'test-print-adapter',
      async print(context) {
        calls.push(context)
      },
    })

    await viewer.open({ schema: createFixedSchema() })
    await viewer.print({ pageSizeMode: 'fixed' })

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(0)
  })

  it('throws print adapter failures when throwOnError is enabled', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    viewer.registerPrintAdapter({
      id: 'bad-print-adapter',
      async print() {
        throw new Error('print boom')
      },
    })

    await viewer.open({ schema: createFixedSchema() })

    await expect(viewer.print({ adapterId: 'bad-print-adapter', throwOnError: true })).rejects.toThrow('print boom')
  })

  it('replaces print adapters with the same id', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    const calls: string[] = []

    viewer.registerPrintAdapter({
      id: 'replaceable-print',
      async print() {
        calls.push('old')
      },
    })
    viewer.registerPrintAdapter({
      id: 'replaceable-print',
      async print() {
        calls.push('new')
      },
    })

    await viewer.open({ schema: createFixedSchema() })
    await viewer.print({ adapterId: 'replaceable-print' })

    expect(calls).toEqual(['new'])
  })
})

describe('viewer runtime export behavior', () => {
  it('passes rendered pages, container, and diagnostics callback to export adapters', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    let captured: ViewerExportContext | undefined
    const diagnostics: string[] = []
    const callbackDiagnostics: string[] = []

    viewer.registerExportAdapter({
      id: 'test-export-adapter',
      format: 'pdf',
      async export(context) {
        captured = context
        context.onDiagnostic?.({
          category: 'export-adapter',
          severity: 'warning',
          code: 'EXPORT_WARNING',
          message: 'export warning',
          scope: 'export-adapter',
        })
        return new Blob(['ok'], { type: 'application/pdf' })
      },
    })

    await viewer.open({
      schema: createFixedSchema(),
      onDiagnostic(event) {
        diagnostics.push(event.code)
      },
    })

    const blob = await viewer.exportDocument({
      format: 'pdf',
      onDiagnostic(event) {
        callbackDiagnostics.push(event.code)
      },
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(captured?.container).toBe(container)
    expect(captured?.renderedPages?.[0]).toMatchObject({ width: 80, height: 60, unit: 'mm' })
    expect(diagnostics).toContain('EXPORT_WARNING')
    expect(callbackDiagnostics).toContain('EXPORT_WARNING')
  })

  it('throws export adapter failures when throwOnError is enabled', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    viewer.registerExportAdapter({
      id: 'bad-export-adapter',
      format: 'pdf',
      async export() {
        throw new Error('export boom')
      },
    })

    await viewer.open({ schema: createFixedSchema() })

    await expect(viewer.exportDocument({ format: 'pdf', throwOnError: true })).rejects.toThrow('export boom')
  })

  it('replaces export adapters with the same id', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    const calls: string[] = []

    viewer.registerExportAdapter({
      id: 'replaceable-export',
      format: 'pdf',
      async export() {
        calls.push('old')
      },
    })
    viewer.registerExportAdapter({
      id: 'replaceable-export',
      format: 'pdf',
      async export() {
        calls.push('new')
      },
    })

    await viewer.open({ schema: createFixedSchema() })
    await viewer.exportDocument('pdf')

    expect(calls).toEqual(['new'])
  })
})
