# @easyink/print-easyink-printer

Official EasyInk.Printer client and Viewer print driver.

```ts
import { createEasyInkPrinterClient, createEasyInkPrinterDriver } from '@easyink/print-easyink-printer'

const printer = createEasyInkPrinterClient()
viewer.registerPrintDriver(createEasyInkPrinterDriver({ printer }))

await viewer.open({ schema, data })
await viewer.print({ driverId: 'easyink-printer' })
```
