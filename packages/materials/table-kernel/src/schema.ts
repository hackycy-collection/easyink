import type { TableLayoutConfig, TableTopologySchema } from '@easyink/schema'

/**
 * Create a default table topology with equal column ratios and uniform row height.
 */
export function createDefaultTopology(cols: number, rowCount: number, rowHeight: number): TableTopologySchema {
  const ratio = 1 / cols
  return {
    columns: Array.from({ length: cols }, () => ({ ratio })),
    rows: Array.from({ length: rowCount }, () => ({
      height: rowHeight,
      cells: Array.from({ length: cols }, () => ({})),
    })),
  }
}

/**
 * Create the default table layout config (all borders, 1px solid black).
 */
export function createDefaultLayout(): TableLayoutConfig {
  return {
    borderAppearance: 'all',
    borderWidth: 1,
    borderType: 'solid',
    borderColor: '#000000',
  }
}
