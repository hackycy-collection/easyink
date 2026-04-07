import type { MaterialNode } from '@easyink/schema'
import type { TableStaticProps } from './schema'
import { isTableNode } from '@easyink/schema'

export function renderTableStatic(node: MaterialNode) {
  const props = node.props as unknown as TableStaticProps
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Table]</div>',
    }
  }

  const { topology } = node.table

  // Build colgroup
  let colgroup = '<colgroup>'
  for (const col of topology.columns) {
    colgroup += `<col style="width:${(col.ratio * 100).toFixed(2)}%">`
  }
  colgroup += '</colgroup>'

  let html = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:${props.fontSize}pt;color:${props.color};">${colgroup}`
  for (const row of topology.rows) {
    html += '<tr>'
    for (const cell of row.cells) {
      const text = cell.content?.text || ''
      html += `<td style="border:${props.borderWidth}px ${props.borderType} ${props.borderColor};padding:${props.cellPadding}px;" ${cell.colSpan ? `colspan="${cell.colSpan}"` : ''} ${cell.rowSpan ? `rowspan="${cell.rowSpan}"` : ''}>${text}</td>`
    }
    html += '</tr>'
  }
  html += '</table>'

  return { html }
}
