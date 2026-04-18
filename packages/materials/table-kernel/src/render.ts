import type { TableCellSchema, TableTopologySchema } from '@easyink/schema'
import type { TableBaseProps } from './types'
import { computeRowScale, normalizeColumnRatios } from './geometry'
import { TABLE_BASE_DEFAULTS, TABLE_TYPOGRAPHY_DEFAULTS } from './types'
import { resolveCellTypography } from './typography'

export function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Build `<colgroup>` from column ratios, normalizing to percentage widths.
 */
export function buildColgroup(topology: TableTopologySchema): string {
  const total = normalizeColumnRatios(topology.columns)
  let html = '<colgroup>'
  for (const col of topology.columns) {
    html += `<col style="width:${((col.ratio / total) * 100).toFixed(2)}%">`
  }
  html += '</colgroup>'
  return html
}

/** Options for rendering a table to HTML. */
export interface RenderTableHtmlOptions {
  topology: TableTopologySchema
  props: TableBaseProps
  unit: string
  /** Element height in document units. Used to scale row heights proportionally. */
  elementHeight: number
  /** Extra styles appended to the `<table>` element. */
  tableStyle?: string
  /**
   * Render the content of a single cell. Returns an HTML string.
   * Receives the cell schema, row index, and column index (within topology.rows[ri].cells).
   */
  cellRenderer: (cell: TableCellSchema, rowIndex: number, colIndex: number) => string
  /**
   * Optional per-row decorator. Returns a `skip` flag to omit the row
   * (e.g. hidden bands), `cellStyle` appended to each `<td>` style,
   * and/or `rowStyle` appended to the `<tr>` style.
   */
  rowDecorator?: (rowIndex: number) => { cellStyle?: string, rowStyle?: string, skip?: boolean }
}

/**
 * Shared HTML table renderer used by both designer and viewer of both table types.
 */
export function renderTableHtml(options: RenderTableHtmlOptions): string {
  const { topology, props, unit, elementHeight, tableStyle, cellRenderer, rowDecorator } = options
  const bw = props.borderWidth ?? TABLE_BASE_DEFAULTS.borderWidth
  const bc = escapeAttr(props.borderColor || '#000')
  const bt = props.borderType || 'solid'
  const pad = props.cellPadding ?? TABLE_BASE_DEFAULTS.cellPadding

  const colgroup = buildColgroup(topology)
  const numCols = topology.columns.length

  // Scale row heights to sum exactly to elementHeight, matching geometry layer
  const rowScale = computeRowScale(topology.rows, elementHeight)

  // Pre-compute cells covered by another cell's colSpan/rowSpan — these must
  // NOT emit a <td> because the spanning cell already occupies those slots.
  const spanned = new Set<number>()
  for (let ri = 0; ri < topology.rows.length; ri++) {
    const rowCells = topology.rows[ri]!.cells
    for (let ci = 0; ci < rowCells.length; ci++) {
      const cell = rowCells[ci]!
      const rs = cell.rowSpan ?? 1
      const cs = cell.colSpan ?? 1
      if (rs > 1 || cs > 1) {
        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            if (dr === 0 && dc === 0)
              continue
            spanned.add((ri + dr) * numCols + (ci + dc))
          }
        }
      }
    }
  }

  let rows = ''
  for (let ri = 0; ri < topology.rows.length; ri++) {
    const row = topology.rows[ri]!

    // Row decorator can skip rows (hidden bands) or add styles (background)
    let cellStyle = ''
    let rowExtraStyle = ''
    if (rowDecorator) {
      const dec = rowDecorator(ri)
      if (dec.skip)
        continue
      if (dec.cellStyle)
        cellStyle = dec.cellStyle
      if (dec.rowStyle)
        rowExtraStyle = dec.rowStyle
    }

    const scaledHeight = row.height * rowScale

    let cells = ''
    for (let ci = 0; ci < row.cells.length; ci++) {
      if (spanned.has(ri * numCols + ci))
        continue
      const cell = row.cells[ci]!
      const rs = cell.rowSpan && cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''
      const cs = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''
      const content = cellRenderer(cell, ri, ci)
      const typo = resolveCellTypography(cell, props.typography ?? TABLE_TYPOGRAPHY_DEFAULTS)
      const cb = cell.border
      const borderTop = cb?.top !== false ? `${bw}${unit} ${bt} ${bc}` : 'none'
      const borderRight = cb?.right !== false ? `${bw}${unit} ${bt} ${bc}` : 'none'
      const borderBottom = cb?.bottom !== false ? `${bw}${unit} ${bt} ${bc}` : 'none'
      const borderLeft = cb?.left !== false ? `${bw}${unit} ${bt} ${bc}` : 'none'
      cells += `<td${rs}${cs} style="border-top:${borderTop};border-right:${borderRight};border-bottom:${borderBottom};border-left:${borderLeft};padding:${pad}${unit};font-size:${typo.fontSize}${unit};color:${typo.color};font-weight:${typo.fontWeight};font-style:${typo.fontStyle};line-height:${typo.lineHeight};letter-spacing:${typo.letterSpacing}${unit};text-align:${typo.textAlign};vertical-align:${typo.verticalAlign}${cellStyle}">${content}</td>`
    }
    rows += `<tr style="height:${scaledHeight}${unit}${rowExtraStyle}">${cells}</tr>`
  }

  const extra = tableStyle ? `;${tableStyle}` : ''
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed${extra}">${colgroup}${rows}</table>`
}
