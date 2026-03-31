import type { StaticTableCell, StaticTableProps } from '@easyink/core'
import type { MaterialRenderContext, MaterialRenderFunction } from '../../types'

/**
 * 静态表格渲染器（type: 'table'）
 *
 * 稀疏 cells 模型 -> HTML <table>
 * cells key 格式：`${row}-${col}`
 * 支持 colspan/rowspan 合并单元格。
 */
export const renderTable: MaterialRenderFunction = (node, context) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'easyink-material easyink-table'
  wrapper.dataset.materialId = node.id

  const props = node.props as unknown as StaticTableProps
  const columns = props.columns ?? []
  const rowCount = props.rowCount ?? 0

  if (columns.length === 0 || rowCount === 0)
    return wrapper

  const cells = props.cells ?? {}
  const borderStyle = props.borderStyle ?? 'solid'

  const table = document.createElement('table')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.tableLayout = 'fixed'

  if (props.bordered) {
    table.style.border = `1px ${borderStyle} #000`
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
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  for (const col of columns) {
    const th = document.createElement('th')
    th.textContent = col.title
    th.style.textAlign = col.align ?? 'left'
    if (props.bordered)
      th.style.border = `1px ${borderStyle} #000`
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // ── 数据行（稀疏 cells） ──
  // 追踪被合并覆盖的单元格
  const covered = new Set<string>()
  markCoveredCells(cells, rowCount, columns.length, covered)

  const tbody = document.createElement('tbody')
  for (let r = 0; r < rowCount; r++) {
    const tr = document.createElement('tr')
    for (let c = 0; c < columns.length; c++) {
      const cellKey = `${r}-${c}`

      // 被其他单元格的 colspan/rowspan 覆盖
      if (covered.has(cellKey))
        continue

      const cell = cells[cellKey]
      const td = document.createElement('td')

      if (cell) {
        td.textContent = resolveCellContent(cell, context)
        td.style.textAlign = cell.align ?? columns[c].align ?? 'left'
        if (cell.colspan && cell.colspan > 1)
          td.colSpan = cell.colspan
        if (cell.rowspan && cell.rowspan > 1)
          td.rowSpan = cell.rowspan
        if (context.designMode && cell.binding?.path) {
          td.style.color = '#999'
          td.style.borderBottom = '1px dashed #ccc'
        }
      }

      if (props.bordered)
        td.style.border = `1px ${borderStyle} #000`

      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  wrapper.appendChild(table)
  return wrapper
}

// ─── 辅助函数 ───

/**
 * 标记被 colspan/rowspan 覆盖的单元格位置
 */
function markCoveredCells(
  cells: Record<string, StaticTableCell>,
  rowCount: number,
  colCount: number,
  covered: Set<string>,
): void {
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = cells[`${r}-${c}`]
      if (!cell)
        continue
      const rs = cell.rowspan ?? 1
      const cs = cell.colspan ?? 1
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0)
            continue
          covered.add(`${r + dr}-${c + dc}`)
        }
      }
    }
  }
}

/**
 * 解析单元格内容：binding 优先，其次 value
 * 设计模式下 binding 显示占位符
 */
function resolveCellContent(
  cell: StaticTableCell,
  context: MaterialRenderContext,
): string {
  if (cell.binding?.path) {
    if (context.designMode) {
      return `{{${cell.binding.path}}}`
    }
    const resolved = context.resolver.resolve(cell.binding.path, context.data)
    if (cell.binding.formatter) {
      return context.resolver.format(resolved, cell.binding.formatter)
    }
    return resolved != null ? String(resolved) : ''
  }
  return cell.value ?? ''
}
