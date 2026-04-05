import type { MaterialNode } from '@easyink/schema'
import type { QrcodeProps } from './schema'

export function renderQrcode(node: MaterialNode) {
  const props = node.props as unknown as QrcodeProps
  const value = props.value || ''
  return {
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${props.background};color:${props.foreground};font-size:12px;border:1px solid #ddd;">${value ? `[QR: ${escapeHtml(value)}]` : '[QRCode]'}</div>`,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
