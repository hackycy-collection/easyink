import type { AIMaterialDescriptor } from '@easyink/shared'

export const svgEllipseAIMaterialDescriptor = {
  type: 'svg-ellipse',
  description: 'Ellipse SVG material with inset and stroke controls.',
  properties: ['fillColor', 'borderWidth', 'borderColor', 'ellipseInset'],
  requiredProps: ['fillColor'],
  binding: 'none',
  usage: [
    'Use this material for ellipse-like SVG graphics in the SVG catalog.',
  ],
} satisfies AIMaterialDescriptor
