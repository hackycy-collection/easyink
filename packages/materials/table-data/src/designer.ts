import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { UnitType } from '@easyink/shared'
import type { TableDataProps } from './schema'
import { escapeHtml, renderTableHtml, TABLE_COMMON_CONTEXT_ACTIONS } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

const ROLE_BG_MAP: Record<string, keyof TableDataProps> = {
  header: 'headerBackground',
  footer: 'summaryBackground',
}

export function renderTableDataContent(
  node: MaterialNode,
  context: { unit: UnitType, getBindingLabel: (binding: BindingRef) => string },
): { html: string } {
  if (!isTableNode(node)) {
    return { html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">table-data</div>` }
  }

  const p = node.props as unknown as TableDataProps

  const html = renderTableHtml({
    topology: node.table.topology,
    props: p,
    unit: context.unit,
    cellRenderer: (cell) => {
      if (cell.binding) {
        const label = context.getBindingLabel(cell.binding)
        return `<span style="color:#1890ff">{{${escapeHtml(label)}}}</span>`
      }
      return cell.content?.text || ''
    },
    rowDecorator: (ri) => {
      const row = node.table.topology.rows[ri]
      if (!row)
        return {}
      const bgKey = ROLE_BG_MAP[row.role]
      const bg = bgKey ? (p as unknown as Record<string, string>)[bgKey] || '' : ''
      return bg ? { cellStyle: `;background:${bg}` } : {}
    },
  })
  return { html }
}

export function getTableDataContextActions(_node: MaterialNode) {
  return [...TABLE_COMMON_CONTEXT_ACTIONS, { id: 'bind-datasource', label: 'Bind Data Source' }]
}
