/**
 * Local replacement for the deleted `@easyink/material-table-data` placeholder
 * helpers. Per `.github/architecture/23-table-interaction.md` §23.8, designer
 * does not render virtual placeholder rows anymore, so the viewer layout uses
 * `node.height` directly. These functions remain only to keep the existing
 * `stack-flow-layout` plumbing intact without rippling further changes.
 */

import type { MaterialNode, TableNode } from '@easyink/schema'
import { isTableNode } from '@easyink/schema'

export function isTableDataNodeForLayout(node: MaterialNode): node is TableNode {
  return isTableNode(node) && node.type === 'table-data'
}

export function getTableDataDesignerVisualHeight(node: MaterialNode): number {
  return node.height
}
