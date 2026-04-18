import type { DatasourceDropHandler, MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { UnitType } from '@easyink/shared'
import type { TableStaticProps } from './schema'
import {
  BindStaticCellCommand,
} from '@easyink/core'
import { computeCellRect, escapeHtml, hitTestGridCell, renderTableHtml, resolveMergeOwner } from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

function buildHtml(node: MaterialNode, unit: UnitType, context: MaterialExtensionContext): string {
  if (!isTableNode(node)) {
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">table-static</div>`
  }

  const p = node.props as unknown as TableStaticProps
  return renderTableHtml({
    topology: node.table.topology,
    props: p,
    unit,
    elementHeight: node.height,
    tableStyle: 'height:100%',
    cellRenderer: (cell) => {
      if (cell.staticBinding) {
        const label = context.getBindingLabel(cell.staticBinding)
        return `<span style="">{#${escapeHtml(label)}}</span>`
      }
      return cell.content?.text || ''
    },
  })
}

function createDatasourceDropHandler(context: MaterialExtensionContext): DatasourceDropHandler {
  return {
    onDragOver(field, point, node) {
      if (!isTableNode(node))
        return null

      const gridCell = hitTestGridCell(node.table.topology, node.width, node.height, point.x, point.y)
      if (!gridCell)
        return null
      const cell = resolveMergeOwner(node.table.topology, gridCell.row, gridCell.col)
      const cellRect = computeCellRect(node.table.topology, node.width, node.height, cell.row, cell.col)
      if (!cellRect)
        return null

      return { status: 'accepted', rect: cellRect, label: field.fieldLabel }
    },

    onDrop(field, point, node) {
      if (!isTableNode(node))
        return

      const gridCell = hitTestGridCell(node.table.topology, node.width, node.height, point.x, point.y)
      if (!gridCell)
        return
      const cell = resolveMergeOwner(node.table.topology, gridCell.row, gridCell.col)

      const binding: BindingRef = {
        sourceId: field.sourceId,
        sourceName: field.sourceName,
        sourceTag: field.sourceTag,
        fieldPath: field.fieldPath,
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
      }

      context.commitCommand(new BindStaticCellCommand(node, cell.row, cell.col, binding))
    },
  }
}

export function createTableStaticExtension(context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const schema = context.getSchema()
        container.innerHTML = buildHtml(nodeSignal.get(), schema.unit, context)
      }
      render()
      return nodeSignal.subscribe(render)
    },
    datasourceDrop: createDatasourceDropHandler(context),
  }
}
