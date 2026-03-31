import type { MaterialRenderFunction } from '@easyink/renderer'

interface BarcodeProps {
  format: string
  value: string
  displayValue?: boolean
  barWidth?: number
  errorCorrectionLevel?: string
}

export const renderBarcode: MaterialRenderFunction = (node, context) => {
  const el = document.createElement('div')
  el.className = 'easyink-material easyink-barcode'
  el.dataset.materialId = node.id

  const props = node.props as unknown as BarcodeProps

  let value: string = props.value ?? ''
  if (node.binding?.path) {
    if (context.designMode) {
      value = `{{${node.binding.path}}}`
    }
    else {
      const resolved = context.resolver.resolve(node.binding.path, context.data)
      if (resolved != null)
        value = String(resolved)
    }
  }

  el.dataset.barcodeFormat = props.format ?? 'CODE128'
  el.dataset.barcodeValue = value
  if (props.barWidth != null)
    el.dataset.barcodeBarWidth = String(props.barWidth)
  if (props.errorCorrectionLevel)
    el.dataset.barcodeEcLevel = props.errorCorrectionLevel

  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.border = '1px dashed #ccc'
  el.style.fontSize = '12px'
  el.style.color = '#999'

  const formatLabel = document.createElement('span')
  formatLabel.textContent = `[${props.format ?? 'CODE128'}]`
  el.appendChild(formatLabel)

  if (props.displayValue !== false) {
    const valueLabel = document.createElement('span')
    valueLabel.textContent = value || '(empty)'
    el.appendChild(valueLabel)
  }

  return el
}
