/**
 * PropSchema declarations for cell-level properties in the property panel overlay.
 * Used by table-data and table-static materials when pushing a cell-selected overlay.
 *
 * Type-compatible with PropSchemaLike from @easyink/core without importing it
 * (table-kernel deliberately avoids depending on core).
 */
export const CELL_PROP_SCHEMAS: Array<{
  key: string
  label: string
  type: string
  group?: string
  min?: number
  max?: number
  step?: number
  enum?: Array<{ label: string, value: unknown }>
}> = [
  { key: 'fontSize', label: 'designer.property.fontSize', type: 'number', group: 'cell-typography', min: 1, max: 100, step: 1 },
  { key: 'color', label: 'designer.property.color', type: 'color', group: 'cell-typography' },
  { key: 'fontWeight', label: 'designer.property.fontWeight', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
  ] },
  { key: 'fontStyle', label: 'designer.property.fontStyle', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Normal', value: 'normal' },
    { label: 'Italic', value: 'italic' },
  ] },
  { key: 'textAlign', label: 'designer.property.textAlign', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
  ] },
  { key: 'verticalAlign', label: 'designer.property.verticalAlign', type: 'enum', group: 'cell-typography', enum: [
    { label: 'Top', value: 'top' },
    { label: 'Middle', value: 'middle' },
    { label: 'Bottom', value: 'bottom' },
  ] },
  { key: 'padding', label: 'designer.property.padding', type: 'number', group: 'cell-layout', min: 0, max: 20, step: 1 },
  { key: 'border', label: 'designer.property.border', type: 'border-toggle', group: 'cell-border' },
]
