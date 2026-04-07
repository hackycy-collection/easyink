import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { BarcodeProps } from './schema'
import { generateBarcodeSvg } from './render'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderBarcodeContent(
  node: MaterialNode,
  context: { getBindingLabel: (binding: BindingRef) => string },
): { html: string } {
  const p = node.props as unknown as BarcodeProps

  let label: string | undefined
  if (node.binding) {
    const b = Array.isArray(node.binding) ? node.binding[0] : node.binding
    label = `{{${escapeHtml(context.getBindingLabel(b))}}}`
  }

  const value = p.value || ''

  // No value: show placeholder barcode with a sample value
  if (!value) {
    return { html: renderPlaceholder(p, label || p.format) }
  }

  // Generate real barcode
  let svg: string
  try {
    svg = generateBarcodeSvg(value, {
      format: p.format,
      lineWidth: p.lineWidth,
      lineColor: p.lineColor,
      backgroundColor: p.backgroundColor,
      showText: p.showText,
    })
  }
  catch {
    // Invalid value for format -- show error placeholder
    return { html: renderErrorPlaceholder(p, value) }
  }

  if (label) {
    // Overlay binding label
    const html = `<div style="position:relative;width:100%;height:100%">${svg}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="background:rgba(255,255,255,0.8);padding:1px 4px;font-size:10px;color:${p.lineColor};border-radius:2px;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span></div></div>`
    return { html }
  }

  return { html: svg }
}

function renderPlaceholder(p: BarcodeProps, label: string): string {
  // Use a sample value to show a representative barcode
  const sampleValues: Record<string, string> = {
    CODE128: 'EasyInk',
    CODE39: 'EASYINK',
    EAN13: '5901234123457',
    EAN8: '96385074',
    UPC: '123456789012',
    ITF14: '98765432109213',
  }
  const sampleValue = sampleValues[p.format] || 'EasyInk'

  let svg: string
  try {
    svg = generateBarcodeSvg(sampleValue, {
      format: p.format,
      lineWidth: p.lineWidth,
      lineColor: p.lineColor,
      backgroundColor: p.backgroundColor,
      showText: false,
    })
  }
  catch {
    return renderErrorPlaceholder(p, label)
  }

  return `<div style="position:relative;width:100%;height:100%;opacity:0.4">${svg}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="background:rgba(255,255,255,0.8);padding:1px 4px;font-size:10px;color:${p.lineColor};border-radius:2px">${label}</span></div></div>`
}

function renderErrorPlaceholder(p: BarcodeProps, value: string): string {
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.backgroundColor};color:#e53e3e;font-size:11px;border:1px dashed #e53e3e;box-sizing:border-box">Invalid: ${escapeHtml(value)}</div>`
}

export function getBarcodeContextActions(_node: MaterialNode) {
  return [
    { id: 'edit-value', label: 'Edit Value' },
  ]
}
