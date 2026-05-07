import type { TableNode } from '@easyink/schema'
import { readTrustedViewerHtml } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { createTableDataNode } from './schema'
import { renderTableData } from './viewer'

describe('renderTableData', () => {
  it('escapes plain text cell content', () => {
    const node = createTableDataNode() as TableNode
    node.table.topology.rows[1]!.cells[0]!.content = {
      text: '<script>alert(1)</script>',
    }

    const output = renderTableData(node, {
      data: {},
      resolvedProps: node.props,
      pageIndex: 0,
      unit: 'mm',
      zoom: 1,
    })

    const html = readTrustedViewerHtml(output.html!)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})
