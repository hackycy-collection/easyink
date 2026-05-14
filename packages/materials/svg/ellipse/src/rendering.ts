import type { SvgEllipseProps } from './schema'
import { escapeHtml } from '@easyink/shared'

export function buildSvgEllipseMarkup(props: SvgEllipseProps, unit = 'mm'): string {
  const inset = Math.max(0, Math.min(36, props.ellipseInset || 8))
  const borderWidth = Math.max(0, props.borderWidth || 0)
  return `<svg viewBox="0 0 120 80" preserveAspectRatio="none" style="width:100%;height:100%;display:block" xmlns="http://www.w3.org/2000/svg">`
    + `<ellipse cx="60" cy="40" rx="${(60 - inset).toFixed(2)}" ry="${(40 - inset).toFixed(2)}" fill="${escapeHtml(props.fillColor || 'transparent')}" stroke="${escapeHtml(borderWidth > 0 ? props.borderColor : 'transparent')}" stroke-width="${borderWidth}${unit}" vector-effect="non-scaling-stroke" />`
    + `</svg>`
}
