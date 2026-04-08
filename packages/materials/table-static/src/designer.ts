import type { MaterialNode } from '@easyink/schema'
import type { UnitType } from '@easyink/shared'
import type { TableStaticProps } from './schema'
import { renderTableHtml, TABLE_COMMON_CONTEXT_ACTIONS } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

export function renderTableStaticContent(
  node: MaterialNode,
  context: { unit: UnitType },
): { html: string } {
  if (!isTableNode(node)) {
    return { html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">table-static</div>` }
  }

  const p = node.props as unknown as TableStaticProps
  const html = renderTableHtml({
    topology: node.table.topology,
    props: p,
    unit: context.unit,
    cellRenderer: cell => cell.content?.text || '',
  })
  return { html }
}

export function getTableStaticContextActions(_node: MaterialNode) {
  return [...TABLE_COMMON_CONTEXT_ACTIONS]
}
