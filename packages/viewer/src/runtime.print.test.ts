import type { DocumentSchema, TableNode } from '@easyink/schema'
import type { ViewerRuntime } from './runtime'
import type { ViewerPrintOptions } from './types'
import { LINE_TYPE, renderLine } from '@easyink/material-line'
import { measureTableData, renderTableData, TABLE_DATA_TYPE } from '@easyink/material-table-data'
import { describe, expect, it } from 'vitest'
import { createViewer } from './index'

function registerTestMaterials(viewer: ViewerRuntime): void {
  viewer.registerMaterial(LINE_TYPE, { render: (node, ctx) => renderLine(node, ctx) })
  viewer.registerMaterial(TABLE_DATA_TYPE, {
    render: (node, ctx) => renderTableData(node, ctx),
    measure: (node, ctx) => measureTableData(node, ctx),
  })
}

function getPrintStyles(viewer: ViewerRuntime, options?: ViewerPrintOptions): string {
  return (viewer as unknown as { buildPrintStyles: (options?: ViewerPrintOptions) => string }).buildPrintStyles(options)
}

describe('viewer runtime print styles', () => {
  it('does not force a fixed page size for stack-mode browser printing', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    registerTestMaterials(viewer)

    const pageHeight = 100
    const itemsTable: TableNode = {
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

    const schema: DocumentSchema = {
      version: '1.0.0',
      unit: 'mm',
      page: {
        mode: 'stack',
        width: 80,
        height: pageHeight,
      },
      guides: { x: [], y: [] },
      elements: [
        itemsTable,
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

    await viewer.open({
      schema,
      data: {
        items: Array.from({ length: 10 }, (_, index) => ({ name: `Item ${index + 1}`, qty: index + 1 })),
      },
    })

    const pageEl = container.querySelector('.ei-viewer-page') as HTMLElement | null
    expect(pageEl).not.toBeNull()
    expect(Number.parseFloat(pageEl!.style.height)).toBeGreaterThan(pageHeight)

    const printStyles = getPrintStyles(viewer)
    expect(printStyles).not.toContain('size: 80mm')
    expect(printStyles).toContain('break-after: auto;')
    expect(printStyles).toContain('break-inside: auto;')
  })

  it('uses the rendered stack height when browser printing targets pdf', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })
    registerTestMaterials(viewer)

    const itemsTable: TableNode = {
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

    const schema: DocumentSchema = {
      version: '1.0.0',
      unit: 'mm',
      page: {
        mode: 'stack',
        width: 80,
        height: 100,
      },
      guides: { x: [], y: [] },
      elements: [itemsTable],
    }

    await viewer.open({
      schema,
      data: {
        items: Array.from({ length: 10 }, (_, index) => ({ name: `Item ${index + 1}`, qty: index + 1 })),
      },
    })

    const pageEl = container.querySelector('.ei-viewer-page') as HTMLElement | null
    expect(pageEl).not.toBeNull()

    const printStyles = getPrintStyles(viewer, { browserTarget: 'pdf' })
    expect(printStyles).toContain(`size: ${pageEl!.style.width} ${pageEl!.style.height};`)
    expect(printStyles).toContain('break-after: auto;')
  })

  it('keeps fixed-page browser printing constrained to the template size', async () => {
    const container = document.createElement('div')
    const viewer = createViewer({ container })

    const schema: DocumentSchema = {
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

    await viewer.open({ schema })

    const printStyles = getPrintStyles(viewer)
    expect(printStyles).toContain('size: 80mm 60mm;')
    expect(printStyles).toContain('break-after: page;')
    expect(printStyles).toContain('break-inside: avoid;')
  })
})
