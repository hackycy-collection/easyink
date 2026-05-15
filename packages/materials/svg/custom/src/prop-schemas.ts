import type { PropSchema } from '@easyink/core'

const SVG_PRESERVE_ASPECT_RATIO_OPTIONS: NonNullable<PropSchema['enum']> = [
  { label: 'designer.option.svgFitFill', value: 'none' },
  { label: 'designer.option.svgFitContain', value: 'xMidYMid meet' },
  { label: 'designer.option.svgFitCover', value: 'xMidYMid slice' },
]

export const svgCustomDesignerPropSchemas: PropSchema[] = [
  { key: 'content', label: 'designer.property.svgContent', type: 'textarea', group: 'content', editorOptions: { rows: 8, placeholder: '<svg viewBox="0 0 24 24">\n  <path d="..." />\n</svg>' } },
  { key: 'viewBox', label: 'designer.property.viewBox', type: 'string', group: 'content', editorOptions: { placeholder: '0 0 100 100' } },
  { key: 'preserveAspectRatio', label: 'designer.property.svgPreserveAspectRatio', type: 'enum', group: 'content', enum: SVG_PRESERVE_ASPECT_RATIO_OPTIONS },
  { key: 'fillColor', label: 'designer.property.fillColor', type: 'color', group: 'appearance' },
]
