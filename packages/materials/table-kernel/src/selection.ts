/**
 * TableCellSelection：共享给 table-static / table-data。
 * 见 `.github/architecture/22-editor-core.md` §22.5。
 */

import type { Selection, SelectionJSON, SelectionTypeSpec } from '@easyink/core'

export interface TableCellSelection extends Selection {
  readonly type: 'table-cell'
  readonly nodeId: string
  readonly path: readonly [row: number, col: number]
}

export function tableCellSelection(nodeId: string, row: number, col: number): TableCellSelection {
  const path = [row, col] as const
  return {
    type: 'table-cell',
    nodeId,
    path,
    toJSON() {
      return { type: 'table-cell', nodeId, path: [row, col] }
    },
  }
}

export const tableCellSelectionSpec: SelectionTypeSpec = {
  type: 'table-cell',
  fromJSON(json: SelectionJSON) {
    const path = Array.isArray(json.path) ? (json.path as unknown[]) : []
    const row = typeof path[0] === 'number' ? (path[0] as number) : 0
    const col = typeof path[1] === 'number' ? (path[1] as number) : 0
    return tableCellSelection(json.nodeId ?? '', row, col)
  },
}
