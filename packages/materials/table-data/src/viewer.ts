import type { MaterialNode, TableSchema } from '@easyink/schema'
import type { TableDataProps } from './schema'

export function renderTableData(node: MaterialNode) {
  const props = node.props as unknown as TableDataProps
  const table = node.extensions?.table as TableSchema | undefined
  if (!table) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Data Table]</div>',
    }
  }

  let html = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:${props.fontSize}pt;color:${props.color};">`
  for (const section of table.sections) {
    const bg = section.kind === 'header'
      ? props.headerBackground
      : section.kind === 'total'
        ? props.totalBackground
        : ''
    for (const row of section.rows) {
      html += `<tr${bg ? ` style="background:${bg}"` : ''}>`
      for (const cell of row.cells) {
        html += `<td style="border:${props.borderWidth}px ${props.borderType} ${props.borderColor};padding:${props.cellPadding}px;" ${cell.colSpan ? `colspan="${cell.colSpan}"` : ''} ${cell.rowSpan ? `rowspan="${cell.rowSpan}"` : ''}></td>`
      }
      html += '</tr>'
    }
  }
  html += '</table>'

  return { html }
}
