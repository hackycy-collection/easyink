import type { PrintDriver } from '@easyink/viewer'
import { createEasyInkPrinterDriver as createOfficialEasyInkPrinterDriver } from '@easyink/print-easyink'
import { useEasyInkPrint } from '../hooks/useEasyInkPrint'

export function createEasyInkPrintDriver(): PrintDriver {
  const service = useEasyInkPrint()

  return createOfficialEasyInkPrinterDriver({
    id: 'easyink-print-driver',
    client: service.client,
    printerName: () => service.printerName.value,
    copies: () => service.copies.value,
    forcePaperSize: () => service.forcePageSize.value,
  })
}
