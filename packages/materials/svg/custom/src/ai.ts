import type { AIMaterialDescriptor } from '@easyink/shared'

export const svgCustomAIMaterialDescriptor = {
  type: 'svg',
  description: 'Custom inline SVG material for raw vector content.',
  properties: ['content', 'viewBox', 'preserveAspectRatio', 'fillColor'],
  requiredProps: ['content', 'viewBox', 'preserveAspectRatio'],
  binding: 'none',
  usage: [
    'Use this material when the SVG markup is provided directly.',
  ],
} satisfies AIMaterialDescriptor
