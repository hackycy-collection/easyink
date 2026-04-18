/**
 * table-data 设计态扩展。
 *
 * 与 `.github/architecture/23-table-interaction.md` §23.2/§23.8 保持一致：
 * - 不渲染任何虚拟 placeholder 行；repeat-template 在设计态只显示一行
 * - 命中测试与 cell 矩形完全使用 kernel 的标准 `hitTestGridCell`/`computeCellRect`
 * - 设计态可视高度 = `node.height`
 *
 * `repeat-template` 行的"循环 N 行"由 designer 在该行右侧叠加角标提示
 * （由 designer 包内的 overlay 实现，本扩展不参与）。
 */

import type { DatasourceDropHandler, MaterialDesignerExtension, MaterialExtensionContext } from '@easyink/core'
import type { BindingRef, MaterialNode, TableDataSchema, TableRowSchema } from '@easyink/schema'
import type { UnitType } from '@easyink/shared'
import type { TableDataProps } from './schema'
import {
  BindStaticCellCommand,
  UpdateTableCellCommand,
} from '@easyink/core'
import {
  computeCellRect,
  escapeHtml,
  hitTestGridCell,
  renderTableHtml,
  resolveMergeOwner,
} from '@easyink/material-table-kernel'
import { isTableNode } from '@easyink/schema'

const ROLE_BG_MAP: Record<string, keyof TableDataProps> = {
  header: 'headerBackground',
  footer: 'summaryBackground',
}

function buildHtml(node: MaterialNode, unit: UnitType, context: MaterialExtensionContext): string {
  if (!isTableNode(node)) {
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">table-data</div>`
  }

  const p = node.props as unknown as TableDataProps
  const tableData = node.table as TableDataSchema
  const showHeader = tableData.showHeader !== false
  const showFooter = tableData.showFooter !== false

  return renderTableHtml({
    topology: node.table.topology,
    props: p,
    unit,
    elementHeight: node.height,
    tableStyle: 'height:100%',
    cellRenderer: (cell) => {
      if (cell.binding) {
        const label = context.getBindingLabel(cell.binding)
        return `<span style="">{#${escapeHtml(label)}}</span>`
      }
      if (cell.staticBinding) {
        const label = context.getBindingLabel(cell.staticBinding)
        return `<span style="">{#${escapeHtml(label)}}</span>`
      }
      return cell.content?.text || ''
    },
    rowDecorator: (ri) => {
      const row = node.table.topology.rows[ri]
      if (!row)
        return {}
      if (row.role === 'header' && !showHeader)
        return { cellStyle: ';opacity:0.4;text-decoration:line-through' }
      if (row.role === 'footer' && !showFooter)
        return { cellStyle: ';opacity:0.4;text-decoration:line-through' }
      const bgKey = ROLE_BG_MAP[row.role]
      const bg = bgKey ? (p as unknown as Record<string, string>)[bgKey] || '' : ''
      if (bg)
        return { cellStyle: `;background:${bg}` }
      if (p.stripedRows && p.stripedColor && !bgKey && ri % 2 === 1)
        return { cellStyle: `;background:${p.stripedColor}` }
      return {}
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
      const row = node.table.topology.rows[cell.row]
      if (!row)
        return null

      if (row.role === 'repeat-template' && field.sourceId && field.fieldPath) {
        const incomingPrefix = getFieldCollectionPrefix(field.fieldPath)
        const existingPrefixes = getRowCollectionPrefixes(row)
        if (existingPrefixes.length > 0 && existingPrefixes[0] !== incomingPrefix) {
          const cellRect = computeCellRect(node.table.topology, node.width, node.height, cell.row, cell.col)
          if (!cellRect)
            return null
          return {
            status: 'rejected',
            rect: cellRect,
            label: context.t('designer.dataSource.collectionMismatch'),
          }
        }
      }

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
      const row = node.table.topology.rows[cell.row]
      if (!row)
        return

      const binding: BindingRef = {
        sourceId: field.sourceId,
        sourceName: field.sourceName,
        sourceTag: field.sourceTag,
        fieldPath: field.fieldPath,
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
      }

      if (row.role === 'repeat-template') {
        const incomingPrefix = getFieldCollectionPrefix(field.fieldPath)
        const existingPrefixes = getRowCollectionPrefixes(row)
        if (existingPrefixes.length > 0 && existingPrefixes[0] !== incomingPrefix)
          return

        context.commitCommand(new UpdateTableCellCommand(node, cell.row, cell.col, { binding }))
      }
      else {
        context.commitCommand(new BindStaticCellCommand(node, cell.row, cell.col, binding))
      }
    },
  }
}

function getFieldCollectionPrefix(fieldPath: string): string {
  const lastSep = fieldPath.lastIndexOf('/')
  return lastSep > 0 ? fieldPath.substring(0, lastSep) : ''
}

function getRowCollectionPrefixes(row: TableRowSchema): string[] {
  const prefixes = new Set<string>()
  for (const cell of row.cells) {
    if (cell.binding?.fieldPath) {
      prefixes.add(getFieldCollectionPrefix(cell.binding.fieldPath))
    }
  }
  return [...prefixes]
}

export function createTableDataExtension(context: MaterialExtensionContext): MaterialDesignerExtension {
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
    getVisualHeight(node) {
      return node.height
    },
  }
}
