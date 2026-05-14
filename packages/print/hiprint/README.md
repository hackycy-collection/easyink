# @easyink/print-hiprint

Official HiPrint client and Viewer print driver.

```ts
import { createHiPrintClient, createHiPrintDriver } from '@easyink/print-hiprint'

const hiPrint = createHiPrintClient()
viewer.registerPrintDriver(createHiPrintDriver({ client: hiPrint }))

await viewer.open({ schema, data })
await viewer.print({ driverId: 'hiprint' })
```
