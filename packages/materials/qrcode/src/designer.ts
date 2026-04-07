import type { BindingRef, MaterialNode } from '@easyink/schema'
import type { QrcodeProps } from './schema'
import { generateQrcodeSvg } from './render'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderQrcodeContent(
  node: MaterialNode,
  context: { getBindingLabel: (binding: BindingRef) => string },
): { html: string } {
  const p = node.props as unknown as QrcodeProps

  let label: string | undefined
  if (node.binding) {
    const b = Array.isArray(node.binding) ? node.binding[0] : node.binding
    label = `{{${escapeHtml(context.getBindingLabel(b))}}}`
  }

  // When there's a binding (no real value yet) or value is empty, show labeled placeholder
  const value = p.value || ''
  if (!value) {
    label = label || 'QR'
    return { html: renderPlaceholder(p, label) }
  }

  // For binding labels in design mode, overlay the label on the real QR code
  const svg = generateQrcodeSvg(value, {
    errorCorrectionLevel: p.errorCorrectionLevel,
    foreground: p.foreground,
    background: p.background,
  })

  if (label) {
    // Overlay binding label on real QR code
    const html = `<div style="position:relative;width:100%;height:100%">${svg}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="background:rgba(255,255,255,0.8);padding:1px 4px;font-size:10px;color:${p.foreground};border-radius:2px;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span></div></div>`
    return { html }
  }

  return { html: svg }
}

function renderPlaceholder(p: QrcodeProps, label: string): string {
  const svg = generateQrcodeSvg('https://easyink.dev', {
    errorCorrectionLevel: p.errorCorrectionLevel,
    foreground: p.foreground,
    background: p.background,
  })
  return `<div style="position:relative;width:100%;height:100%;opacity:0.4">${svg}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="background:rgba(255,255,255,0.8);padding:1px 4px;font-size:10px;color:${p.foreground};border-radius:2px">${label}</span></div></div>`
}

export function getQrcodeContextActions(_node: MaterialNode) {
  return [
    { id: 'edit-value', label: 'Edit Value' },
  ]
}
