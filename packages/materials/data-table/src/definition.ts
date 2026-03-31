import type { MaterialTypeDefinition } from '@easyink/core'
import { dataTablePropSchemas } from './props'

export const dataTableDefinition: MaterialTypeDefinition = {
  type: 'data-table',
  name: '数据表格',
  icon: 'data-table',
  category: 'table',
  propSchemas: dataTablePropSchemas,
  defaultProps: {
    columns: [],
    bordered: true,
    striped: false,
    rowHeight: 'auto',
    showHeader: true,
  },
  defaultLayout: {
    position: 'flow',
    width: 'auto',
    height: 'auto',
  },
  isContainer: true,
  supportsRepeat: true,
}
