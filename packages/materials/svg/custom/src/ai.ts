import type { AIMaterialDescriptor } from '@easyink/shared'

export const svgCustomAIMaterialDescriptor = {
  type: 'svg',
  description: 'Custom SVG material that accepts a complete pasted <svg> or sanitized SVG child markup.',
  properties: ['content', 'viewBox', 'preserveAspectRatio', 'fillColor'],
  requiredProps: ['content'],
  binding: 'none',
  usage: [
    'Use this material only when the user needs to paste or generate raw SVG markup directly.',
    'For built-in shapes such as star, ellipse, or heart, use the dedicated SVG shape materials instead of writing SVG content.',
  ],
} satisfies AIMaterialDescriptor
