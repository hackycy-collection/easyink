import type { MaterialNode, TableSchema } from '@easyink/schema'
import type { TableStaticProps } from './schema'

export function renderTableStatic(node: MaterialNode) {
  const props = node.props as unknown as TableStaticProps
  const table = node.extensions?.table as TableSchema | undefined
  if (!table) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Table]</div>',
    }
  }

  let html = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:${props.fontSize}pt;color:${props.color};">`
  for (const section of table.sections) {
    for (const row of section.rows) {
      html += '<tr>'
      for (const cell of row.cells) {
        html += `<td style="border:${props.borderWidth}px ${props.borderType} ${props.borderColor};padding:${props.cellPadding}px;" ${cell.colSpan ? `colspan="${cell.colSpan}"` : ''} ${cell.rowSpan ? `rowspan="${cell.rowSpan}"` : ''}></td>`
      }
      html += '</tr>'
    }
  }
  html += '</table>'

  return { html }
}
