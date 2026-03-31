import type { DataTableColumn, DataTableProps, FormatterConfig } from '@easyink/core'
import type { MaterialRenderFunction } from '@easyink/renderer'

export const renderDataTable: MaterialRenderFunction = (node, context) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'easyink-material easyink-data-table'
  wrapper.dataset.materialId = node.id

  const props = node.props as unknown as DataTableProps
  const columns = props.columns ?? []

  if (columns.length === 0)
    return wrapper

  const table = document.createElement('table')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.tableLayout = 'fixed'

  if (props.bordered) {
    table.style.border = '1px solid #000'
  }

  // ── 列宽 ──
  const colgroup = document.createElement('colgroup')
  for (const col of columns) {
    const colEl = document.createElement('col')
    colEl.style.width = `${col.width}%`
    colgroup.appendChild(colEl)
  }
  table.appendChild(colgroup)

  // ── 表头 ──
  if (props.showHeader !== false) {
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    for (const col of columns) {
      const th = document.createElement('th')
      th.textContent = col.title
      th.style.textAlign = col.align ?? 'left'
      if (props.bordered)
        th.style.border = '1px solid #000'
      headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)
    table.appendChild(thead)
  }

  // ── 数据行 ──
  const tbody = document.createElement('tbody')

  if (context.designMode) {
    const placeholderRowCount = 2
    for (let i = 0; i < placeholderRowCount; i++) {
      const tr = document.createElement('tr')
      if (props.striped && i % 2 === 1)
        tr.style.backgroundColor = '#f9f9f9'
      for (let c = 0; c < columns.length; c++) {
        const td = document.createElement('td')
        const col = columns[c]
        td.textContent = col.binding?.path ? `{{${col.binding.path}}}` : ''
        td.style.textAlign = col.align ?? 'left'
        td.style.color = '#999'
        td.style.borderBottom = '1px dashed #ccc'
        if (props.bordered)
          td.style.border = '1px solid #000'
        if (props.rowHeight != null && props.rowHeight !== 'auto')
          td.style.height = `${context.toPixels(props.rowHeight)}px`
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  }
  else {
    const columnData = resolveColumns(columns, context)
    const rowCount = columnData.rowCount

    for (let i = 0; i < rowCount; i++) {
      const tr = document.createElement('tr')
      if (props.striped && i % 2 === 1)
        tr.style.backgroundColor = '#f9f9f9'

      for (let c = 0; c < columns.length; c++) {
        const td = document.createElement('td')
        const cellValue = columnData.columns[c]?.[i]
        td.textContent = cellValue != null ? formatCell(cellValue, columns[c], context) : ''
        td.style.textAlign = columns[c].align ?? 'left'
        if (props.bordered)
          td.style.border = '1px solid #000'
        if (props.rowHeight != null && props.rowHeight !== 'auto')
          td.style.height = `${context.toPixels(props.rowHeight)}px`
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  }

  table.appendChild(tbody)
  wrapper.appendChild(table)
  return wrapper
}

// ─── 辅助函数 ───

interface ColumnDataResult {
  rowCount: number
  columns: unknown[][]
}

function resolveColumns(
  columns: DataTableColumn[],
  context: { resolver: { resolve: (path: string, data: Record<string, unknown>) => unknown }, data: Record<string, unknown> },
): ColumnDataResult {
  const result: unknown[][] = []
  let rowCount = 0
  const prefixes: string[] = []

  for (const col of columns) {
    if (!col.binding?.path) {
      result.push([])
      continue
    }
    const resolved = context.resolver.resolve(col.binding.path, context.data)
    if (!Array.isArray(resolved)) {
      result.push([])
      continue
    }
    result.push(resolved)
    rowCount = Math.max(rowCount, resolved.length)

    const dotIdx = col.binding.path.indexOf('.')
    if (dotIdx > 0)
      prefixes.push(col.binding.path.slice(0, dotIdx))
  }

  // 同源约束检查
  if (prefixes.length > 1) {
    const first = prefixes[0]
    for (let i = 1; i < prefixes.length; i++) {
      if (prefixes[i] !== first) {
        throw new Error(`DataTable columns must share the same data source prefix. Found "${first}" and "${prefixes[i]}"`)
      }
    }
  }

  return { rowCount, columns: result }
}

function formatCell(
  value: unknown,
  col: DataTableColumn,
  context: { resolver: { format: (value: unknown, formatter: FormatterConfig) => string } },
): string {
  if (col.formatter) {
    return context.resolver.format(value, col.formatter)
  }
  return String(value)
}
