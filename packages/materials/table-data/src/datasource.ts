import type { TableRowRole } from '@easyink/shared'

export interface TableDataBindingHint {
  rowRole: TableRowRole
  columnIndex: number
  fieldPath: string
}

export function createBindingHints(columns: string[]): TableDataBindingHint[] {
  return columns.map((fieldPath, index) => ({
    rowRole: 'repeat-template',
    columnIndex: index,
    fieldPath,
  }))
}
