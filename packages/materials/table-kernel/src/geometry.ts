import type { TableColumnSchema, TableRowSchema, TableTopologySchema } from '@easyink/schema'
import type { CellRect } from './types'

/**
 * Compute the sum of all column ratios. Handles the case where sum != 1
 * after interactive column resize. Returns 1 as minimum to prevent division by zero.
 */
export function normalizeColumnRatios(columns: TableColumnSchema[]): number {
  let sum = 0
  for (const col of columns)
    sum += col.ratio
  return sum || 1
}

/**
 * Compute the scale factor to map declared row heights to the element's actual height.
 * Browser `<table>` with `height:100%` distributes height proportionally across rows.
 */
export function computeRowScale(rows: TableRowSchema[], elementHeight: number): number {
  let total = 0
  for (const row of rows)
    total += row.height
  return total > 0 ? elementHeight / total : 1
}

/**
 * Get absolute column widths from ratio-based columns and total element width.
 */
export function computeColumnWidths(columns: TableColumnSchema[], elementWidth: number): number[] {
  const total = normalizeColumnRatios(columns)
  return columns.map(col => (col.ratio / total) * elementWidth)
}

/**
 * Get scaled absolute row heights from declared row heights and total element height.
 */
export function computeRowHeights(rows: TableRowSchema[], elementHeight: number): number[] {
  const scale = computeRowScale(rows, elementHeight)
  return rows.map(row => row.height * scale)
}

/**
 * X positions of column borders between columns (excludes left and right edges).
 */
export function computeColBorderPositions(columns: TableColumnSchema[], elementWidth: number): number[] {
  const widths = computeColumnWidths(columns, elementWidth)
  const positions: number[] = []
  let acc = 0
  for (let i = 0; i < widths.length - 1; i++) {
    acc += widths[i]!
    positions.push(acc)
  }
  return positions
}

/**
 * Y positions of row borders between rows (excludes top and bottom edges).
 */
export function computeRowBorderPositions(rows: TableRowSchema[], elementHeight: number): number[] {
  const heights = computeRowHeights(rows, elementHeight)
  const positions: number[] = []
  let acc = 0
  for (let i = 0; i < heights.length - 1; i++) {
    acc += heights[i]!
    positions.push(acc)
  }
  return positions
}

/**
 * Compute the rectangle of a cell at (row, col) relative to the table element,
 * accounting for colSpan and rowSpan.
 * Returns null if the coordinates are out of range.
 */
export function computeCellRect(
  topology: TableTopologySchema,
  elementWidth: number,
  elementHeight: number,
  row: number,
  col: number,
): CellRect | null {
  const { columns, rows } = topology
  if (row >= rows.length || col >= columns.length)
    return null

  const colWidths = computeColumnWidths(columns, elementWidth)
  const rowHeights = computeRowHeights(rows, elementHeight)

  let x = 0
  for (let c = 0; c < col; c++)
    x += colWidths[c]!

  let y = 0
  for (let r = 0; r < row; r++)
    y += rowHeights[r]!

  const cell = rows[row]!.cells[col]
  const colSpan = cell?.colSpan ?? 1
  const rowSpan = cell?.rowSpan ?? 1

  let w = 0
  for (let c = col; c < Math.min(col + colSpan, columns.length); c++)
    w += colWidths[c]!

  let h = 0
  for (let r = row; r < Math.min(row + rowSpan, rows.length); r++)
    h += rowHeights[r]!

  return { x, y, w, h }
}

/**
 * Pure coordinate-to-cell lookup. Given a point (relX, relY) relative to the
 * table element's top-left corner, returns the grid cell containing that point.
 * Does NOT resolve merge-owners -- call `resolveMergeOwner` on the result if needed.
 */
export function hitTestGridCell(
  topology: TableTopologySchema,
  elementWidth: number,
  elementHeight: number,
  relX: number,
  relY: number,
): { row: number, col: number } | null {
  if (relX < 0 || relY < 0 || relX > elementWidth || relY > elementHeight)
    return null

  const colWidths = computeColumnWidths(topology.columns, elementWidth)
  const rowHeights = computeRowHeights(topology.rows, elementHeight)

  // Find column
  let col = -1
  let accX = 0
  for (let c = 0; c < colWidths.length; c++) {
    if (relX >= accX && relX < accX + colWidths[c]!) {
      col = c
      break
    }
    accX += colWidths[c]!
  }
  if (col < 0)
    col = colWidths.length - 1

  // Find row
  let row = -1
  let accY = 0
  for (let r = 0; r < rowHeights.length; r++) {
    if (relY >= accY && relY < accY + rowHeights[r]!) {
      row = r
      break
    }
    accY += rowHeights[r]!
  }
  if (row < 0)
    row = rowHeights.length - 1

  return { row, col }
}
