import type { SvgHeartProps } from './schema'
import { escapeHtml } from '@easyink/shared'

export function buildSvgHeartMarkup(props: SvgHeartProps, unit = 'mm'): string {
  const cleftDepth = Math.max(6, Math.min(34, props.heartCleftDepth || 18))
  const shoulderWidth = Math.max(10, Math.min(30, props.heartShoulderWidth || 18))
  const path = [
    'M 50 82',
    'C 42 74 24 60 16 46',
    `C 6 29 10 12 ${50 - shoulderWidth} 12`,
    `C ${42 - shoulderWidth / 4} 12 48 ${14 + cleftDepth} 50 ${14 + cleftDepth}`,
    `C 52 ${14 + cleftDepth} ${58 + shoulderWidth / 4} 12 ${50 + shoulderWidth} 12`,
    'C 90 12 94 29 84 46',
    'C 76 60 58 74 50 82',
    'Z',
  ].join(' ')
  const borderWidth = Math.max(0, props.borderWidth || 0)

  return `<svg viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block" xmlns="http://www.w3.org/2000/svg">`
    + `<path d="${path}" fill="${escapeHtml(props.fillColor || 'transparent')}" stroke="${escapeHtml(borderWidth > 0 ? props.borderColor : 'transparent')}" stroke-width="${borderWidth}${unit}" vector-effect="non-scaling-stroke" />`
    + `</svg>`
}
