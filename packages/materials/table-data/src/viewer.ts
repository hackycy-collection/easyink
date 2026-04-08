import type { MaterialNode } from '@easyink/schema'
import type { TableDataProps } from './schema'
import { getBandForRow, renderTableHtml } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

export function renderTableData(node: MaterialNode) {
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Data Table]</div>',
    }
  }

  const props = node.props as unknown as TableDataProps
  const { bands } = node.table

  const html = renderTableHtml({
    topology: node.table.topology,
    props,
    unit: 'mm',
    tableStyle: 'height:100%',
    cellRenderer: cell => cell.content?.text || '',
    rowDecorator: (ri) => {
      const band = getBandForRow(bands, ri)
      const bg = band?.kind === 'header'
        ? props.headerBackground
        : band?.kind === 'summary'
          ? props.summaryBackground
          : ''
      return bg ? { rowStyle: `;background:${bg}` } : {}
    },
  })
  return { html }
}
