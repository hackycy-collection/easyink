import type { MaterialNode } from '@easyink/schema'
import type { BarcodeProps } from './schema'

export function renderBarcode(node: MaterialNode) {
  const props = node.props as unknown as BarcodeProps
  const value = props.value || ''
  return {
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${props.backgroundColor};color:${props.lineColor};font-size:12px;border:1px solid #ddd;">${value ? `[Barcode: ${escapeHtml(value)}]` : '[Barcode]'}</div>`,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
