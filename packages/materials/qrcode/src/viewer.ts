import type { MaterialNode } from '@easyink/schema'
import type { QrcodeProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { generateQrcodeSvg } from './render'

export function renderQrcode(node: MaterialNode) {
  const props = getNodeProps<QrcodeProps>(node)
  const value = props.value == null ? '' : String(props.value)

  if (!value) {
    return {
      html: trustedViewerHtml(`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${props.background};color:${props.foreground};font-size:12px;border:1px solid #ddd;">[QRCode]</div>`),
    }
  }

  return {
    html: trustedViewerHtml(generateQrcodeSvg(value, {
      errorCorrectionLevel: props.errorCorrectionLevel,
      foreground: props.foreground,
      background: props.background,
    })),
  }
}
