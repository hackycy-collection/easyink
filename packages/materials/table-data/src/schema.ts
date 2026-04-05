import type { MaterialNode, TableSchema } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const TABLE_DATA_TYPE = 'table-data'

export interface TableDataProps {
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
  cellPadding: number
  fontSize: number
  color: string
  headerBackground: string
  totalBackground: string
  stripedRows: boolean
  stripedColor: string
}

export const TABLE_DATA_DEFAULTS: TableDataProps = {
  borderWidth: 1,
  borderColor: '#000000',
  borderType: 'solid',
  cellPadding: 4,
  fontSize: 12,
  color: '#000000',
  headerBackground: '#f0f0f0',
  totalBackground: '#f9f9f9',
  stripedRows: false,
  stripedColor: '#fafafa',
}

function createDefaultDataTable(): TableSchema {
  const cellWidth = 80
  const rowHeight = 24
  const cols = 3

  return {
    layout: {
      borderAppearance: 'all',
      borderWidth: 1,
      borderType: 'solid',
      borderColor: '#000000',
    },
    sections: [
      {
        kind: 'header',
        repeatOnEachPage: true,
        rows: [
          {
            height: rowHeight,
            cells: Array.from({ length: cols }, () => ({
              width: cellWidth,
              height: rowHeight,
            })),
          },
        ],
      },
      {
        kind: 'data',
        rows: [
          {
            height: rowHeight,
            cells: Array.from({ length: cols }, () => ({
              width: cellWidth,
              height: rowHeight,
            })),
          },
        ],
      },
      {
        kind: 'total',
        rows: [
          {
            height: rowHeight,
            cells: Array.from({ length: cols }, () => ({
              width: cellWidth,
              height: rowHeight,
            })),
          },
        ],
      },
    ],
  }
}

export function createTableDataNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('td'),
    type: TABLE_DATA_TYPE,
    x: 0,
    y: 0,
    width: 240,
    height: 72,
    props: { ...TABLE_DATA_DEFAULTS },
    ...partial,
    extensions: {
      table: createDefaultDataTable(),
      ...partial?.extensions,
    },
  }
}

export const TABLE_DATA_CAPABILITIES = {
  bindable: true,
  rotatable: false,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: true,
}
