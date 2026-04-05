import type { MaterialNode, TableSchema } from '@easyink/schema'
import { generateId } from '@easyink/shared'

export const TABLE_STATIC_TYPE = 'table-static'

export interface TableStaticProps {
  borderWidth: number
  borderColor: string
  borderType: 'solid' | 'dashed' | 'dotted'
  cellPadding: number
  fontSize: number
  color: string
}

export const TABLE_STATIC_DEFAULTS: TableStaticProps = {
  borderWidth: 1,
  borderColor: '#000000',
  borderType: 'solid',
  cellPadding: 4,
  fontSize: 12,
  color: '#000000',
}

function createDefaultTable(): TableSchema {
  const cellWidth = 60
  const rowHeight = 24
  const rows = Array.from({ length: 3 }, () => ({
    height: rowHeight,
    cells: Array.from({ length: 3 }, () => ({
      width: cellWidth,
      height: rowHeight,
    })),
  }))

  return {
    layout: {
      borderAppearance: 'all',
      borderWidth: 1,
      borderType: 'solid',
      borderColor: '#000000',
    },
    sections: [
      {
        kind: 'data',
        rows,
      },
    ],
  }
}

export function createTableStaticNode(partial?: Partial<MaterialNode>): MaterialNode {
  return {
    id: generateId('ts'),
    type: TABLE_STATIC_TYPE,
    x: 0,
    y: 0,
    width: 180,
    height: 72,
    props: { ...TABLE_STATIC_DEFAULTS },
    ...partial,
    extensions: {
      table: createDefaultTable(),
      ...partial?.extensions,
    },
  }
}

export const TABLE_STATIC_CAPABILITIES = {
  bindable: false,
  rotatable: false,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: false,
  supportsUnionDrop: false,
  multiBinding: false,
}
