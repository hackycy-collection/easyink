import type { MaterialNode } from '@easyink/schema'
import type { TableStaticProps } from './schema'
import { renderTableHtml } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

export function renderTableStatic(node: MaterialNode) {
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Table]</div>',
    }
  }

  const props = node.props as unknown as TableStaticProps
  const html = renderTableHtml({
    topology: node.table.topology,
    props,
    unit: 'mm',
    tableStyle: 'height:100%',
    cellRenderer: cell => cell.content?.text || '',
  })
  return { html }
}
