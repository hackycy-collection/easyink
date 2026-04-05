export interface TableDataBindingHint {
  sectionKind: 'header' | 'data' | 'total'
  columnIndex: number
  fieldPath: string
}

export function createBindingHints(columns: string[]): TableDataBindingHint[] {
  return columns.map((fieldPath, index) => ({
    sectionKind: 'data',
    columnIndex: index,
    fieldPath,
  }))
}
