import type { AIMaterialDescriptor } from '@easyink/shared'

export const svgStarAIMaterialDescriptor = {
  type: 'svg-star',
  description: 'Editable star SVG material with point count, inner ratio, and rotation controls.',
  properties: ['fillColor', 'borderWidth', 'borderColor', 'starPoints', 'starInnerRatio', 'starRotation'],
  requiredProps: ['fillColor', 'starPoints', 'starInnerRatio'],
  binding: 'none',
  usage: [
    'Use this material for decorative stars that need direct on-canvas editing.',
  ],
} satisfies AIMaterialDescriptor
