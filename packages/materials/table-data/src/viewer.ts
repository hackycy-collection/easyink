import type { MaterialNode, TableBandSchema } from '@easyink/schema'
import type { TableDataProps } from './schema'
import { isTableNode } from '@easyink/schema'

function getBandForRow(bands: TableBandSchema[], rowIndex: number): TableBandSchema | undefined {
  for (const band of bands) {
    if (rowIndex >= band.rowRange.start && rowIndex < band.rowRange.end) {
      return band
    }
  }
  return undefined
}

export function renderTableData(node: MaterialNode) {
  const props = node.props as unknown as TableDataProps
  if (!isTableNode(node)) {
    return {
      html: '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;font-size:12px;">[Data Table]</div>',
    }
  }

  const { topology, bands } = node.table

  // Build colgroup
  let colgroup = '<colgroup>'
  for (const col of topology.columns) {
    colgroup += `<col style="width:${(col.ratio * 100).toFixed(2)}%">`
  }
  colgroup += '</colgroup>'

  let html = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:${props.fontSize}pt;color:${props.color};">${colgroup}`
  for (let ri = 0; ri < topology.rows.length; ri++) {
    const row = topology.rows[ri]!
    const band = getBandForRow(bands, ri)
    const bg = band?.kind === 'header'
      ? props.headerBackground
      : band?.kind === 'summary'
        ? props.summaryBackground
        : ''

    html += `<tr${bg ? ` style="background:${bg}"` : ''}>`
    for (const cell of row.cells) {
      const text = cell.content?.text || ''
      html += `<td style="border:${props.borderWidth}px ${props.borderType} ${props.borderColor};padding:${props.cellPadding}px;" ${cell.colSpan ? `colspan="${cell.colSpan}"` : ''} ${cell.rowSpan ? `rowspan="${cell.rowSpan}"` : ''}>${text}</td>`
    }
    html += '</tr>'
  }
  html += '</table>'

  return { html }
}
