import type { MaterialNode } from '@easyink/schema'
import type { TableDataProps } from './schema'
import { renderTableHtml } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

export function renderTableData(node: MaterialNode) {
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Data Table]</div>',
    }
  }

  const props = node.props as unknown as TableDataProps

  const html = renderTableHtml({
    topology: node.table.topology,
    props,
    unit: 'mm',
    tableStyle: 'height:100%',
    cellRenderer: cell => cell.content?.text || '',
    rowDecorator: (ri) => {
      const row = node.table.topology.rows[ri]
      if (!row)
        return {}
      const bg = row.role === 'header'
        ? props.headerBackground
        : row.role === 'footer'
          ? props.summaryBackground
          : ''
      if (bg)
        return { cellStyle: `;background:${bg}` }
      // Striped rows: apply to non-header/footer rows at odd indices
      if (props.stripedRows && props.stripedColor && row.role !== 'header' && row.role !== 'footer' && ri % 2 === 1)
        return { cellStyle: `;background:${props.stripedColor}` }
      return {}
    },
  })
  return { html }
}
