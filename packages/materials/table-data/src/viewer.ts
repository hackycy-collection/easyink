import type { BindingRef, MaterialNode, TableCellSchema, TableDataSchema, TableRowSchema } from '@easyink/schema'
import type { TableDataProps } from './schema'
import { extractCollectionPath, resolveBindingValue, resolveFieldFromRecord } from '@easyink/datasource'
import { computeRowScale, renderTableHtml } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

interface ViewerRenderContext {
  data: Record<string, unknown>
  resolvedProps: Record<string, unknown>
  pageIndex: number
  unit: string
  zoom: number
}

interface ViewerRenderOutput {
  html?: string
  element?: HTMLElement
}

export function renderTableData(node: MaterialNode, context?: ViewerRenderContext): ViewerRenderOutput {
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Data Table]</div>',
    }
  }

  const props = node.props as unknown as TableDataProps
  const tableData = node.table as TableDataSchema
  const showHeader = tableData.showHeader !== false
  const showFooter = tableData.showFooter !== false
  const data = context?.data ?? {}

  // Expand repeat-template rows using collection data
  const expandedRows = expandRepeatTemplateRows(node.table.topology.rows, data)

  // Compute expanded element height
  const originalRowScale = computeRowScale(node.table.topology.rows, node.height)
  let expandedHeight = 0
  for (const row of expandedRows) {
    expandedHeight += row.height * originalRowScale
  }

  const html = renderTableHtml({
    topology: { columns: node.table.topology.columns, rows: expandedRows },
    props,
    unit: 'mm',
    elementHeight: expandedHeight,
    cellRenderer: cell => cell.content?.text || '',
    rowDecorator: (ri) => {
      const row = expandedRows[ri]
      if (!row)
        return {}
      // Viewer: skip hidden header/footer rows entirely
      if (row.role === 'header' && !showHeader)
        return { skip: true }
      if (row.role === 'footer' && !showFooter)
        return { skip: true }
      const bg = row.role === 'header'
        ? props.headerBackground
        : row.role === 'footer'
          ? props.summaryBackground
          : ''
      if (bg)
        return { cellStyle: `;background:${bg}` }
      // Striped rows: apply to non-header/footer rows at odd indices
      if (props.stripedRows && props.stripedColor && row.role !== 'header' && row.role !== 'footer' && ri % 2 === 1)
        return { cellStyle: `;background:${props.stripedColor}` }
      return {}
    },
  })
  return { html }
}

/**
 * Expand repeat-template rows into N data rows by resolving collection bindings.
 * Header/footer rows resolve staticBinding to produce content text.
 */
function expandRepeatTemplateRows(
  rows: TableRowSchema[],
  data: Record<string, unknown>,
): TableRowSchema[] {
  const result: TableRowSchema[] = []

  for (const row of rows) {
    if (row.role !== 'repeat-template') {
      // Header/footer/normal: resolve staticBinding into content
      result.push(resolveStaticRow(row, data))
      continue
    }

    // Collect all binding field paths from repeat-template cells
    const fieldPaths = row.cells
      .filter(c => c.binding?.fieldPath)
      .map(c => c.binding!.fieldPath)

    if (fieldPaths.length === 0) {
      // No bindings — render as single row with static content
      result.push(row)
      continue
    }

    const collectionPath = extractCollectionPath(fieldPaths)
    if (!collectionPath) {
      result.push(row)
      continue
    }

    // Resolve collection from data
    const collectionBinding: BindingRef = { sourceId: '', fieldPath: collectionPath }
    const collectionData = resolveBindingValue(collectionBinding, data)
    if (!Array.isArray(collectionData) || collectionData.length === 0) {
      // Empty or non-array — render single empty row
      result.push(row)
      continue
    }

    // Expand: one row per collection item
    for (const item of collectionData) {
      const record = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
      const expandedCells: TableCellSchema[] = row.cells.map((cell) => {
        if (!cell.binding?.fieldPath)
          return { ...cell }
        const leafField = cell.binding.fieldPath.substring(collectionPath.length + 1)
        const value = resolveFieldFromRecord(leafField, record)
        return {
          ...cell,
          content: { text: value != null ? String(value) : '' },
        }
      })
      result.push({ height: row.height, role: 'normal', cells: expandedCells })
    }
  }

  return result
}

/**
 * Resolve staticBinding on header/footer/normal row cells.
 * Returns the row as-is if no cell has staticBinding.
 */
function resolveStaticRow(
  row: TableRowSchema,
  data: Record<string, unknown>,
): TableRowSchema {
  const needsResolution = row.cells.some(c => c.staticBinding)
  if (!needsResolution)
    return row

  const resolvedCells: TableCellSchema[] = row.cells.map((cell) => {
    if (!cell.staticBinding)
      return cell
    const value = resolveBindingValue(cell.staticBinding, data)
    return {
      ...cell,
      content: { text: value != null ? String(value) : '' },
    }
  })
  return { ...row, cells: resolvedCells }
}
