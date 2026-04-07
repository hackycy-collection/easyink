import type { MaterialNode } from '@easyink/schema'
import type { BarcodeProps } from './schema'
import { generateBarcodeSvg } from './render'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderBarcode(node: MaterialNode) {
  const props = node.props as unknown as BarcodeProps
  const value = props.value || ''

  if (!value) {
    return {
      html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${props.backgroundColor};color:${props.lineColor};font-size:12px;border:1px solid #ddd;">[Barcode]</div>`,
    }
  }

  try {
    return {
      html: generateBarcodeSvg(value, {
        format: props.format,
        lineWidth: props.lineWidth,
        lineColor: props.lineColor,
        backgroundColor: props.backgroundColor,
        showText: props.showText,
      }),
    }
  }
  catch {
    return {
      html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${props.backgroundColor};color:#e53e3e;font-size:12px;border:1px dashed #e53e3e;">Invalid: ${escapeHtml(value)}</div>`,
    }
  }
}
