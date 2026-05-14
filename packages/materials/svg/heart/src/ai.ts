import type { AIMaterialDescriptor } from '@easyink/shared'

export const svgHeartAIMaterialDescriptor = {
  type: 'svg-heart',
  description: 'Heart SVG material with editable cleft depth and shoulder width.',
  properties: ['fillColor', 'borderWidth', 'borderColor', 'heartCleftDepth', 'heartShoulderWidth'],
  requiredProps: ['fillColor'],
  binding: 'none',
  usage: [
    'Use this material for heart graphics that need shape-specific controls.',
  ],
} satisfies AIMaterialDescriptor
