import type { MaterialTypeDefinition } from '@easyink/core'
import { tablePropSchemas } from './props'

export const tableDefinition: MaterialTypeDefinition = {
  type: 'table',
  name: '表格',
  icon: 'table',
  category: 'table',
  propSchemas: tablePropSchemas,
  defaultProps: {
    columns: [
      { key: 'col-1', title: '列 1', width: 50 },
      { key: 'col-2', title: '列 2', width: 50 },
    ],
    rowCount: 3,
    cells: {},
    bordered: true,
    borderStyle: 'solid',
  },
  defaultLayout: {
    position: 'flow',
    width: 'auto',
    height: 'auto',
  },
  isContainer: false,
  supportsRepeat: false,
}
