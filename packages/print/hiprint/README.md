# @easyink/print-hiprint

Official HiPrint client and Viewer print driver.

```ts
import { createHiPrintClient, createHiPrintDriver } from '@easyink/print-hiprint'

const hiPrint = createHiPrintClient()
viewer.registerPrintDriver(createHiPrintDriver({ client: hiPrint }))

await viewer.open({ schema, data })
await viewer.print({ driverId: 'hiprint' })
```

## API audit

This package intentionally uses only the runtime APIs exposed by
`vue-plugin-hiprint`:

- `hiprint.init()`
- `hiprint.refreshPrinterList(callback)`
- `new hiprint.PrintTemplate()`
- `template.addPrintPanel(options)`
- `panel.addPrintHtml({ options })`
- `template.print2(data, options)`
- `template.on('printSuccess' | 'printError', callback)`
- `hiprint.hiwebSocket.setHost(url, token, callback)`
- `hiprint.hiwebSocket.stop()`
- `hiprint.hiwebSocket.printerList`

The wrapper fields `printerName`, `copies`, `orientation`, and `forcePageSize`
are EasyInk-level options. They are translated to `print2` options such as
`printer`, `copies`, `landscape`, `pageSize`, and `scaleFactor`.

`PrintHtmlOptions.width` and `PrintHtmlOptions.height` are millimeters. They
come from `resolveViewerPrintSize()` when using `createHiPrintDriver()`.
`paperHeader` and `paperFooter` are HiPrint panel coordinates in points, matching
the upstream `addPrintPanel()` API. When omitted, EasyInk uses `paperHeader = 0`
and `paperFooter = full page height`, so a rendered Viewer page can occupy the
whole paper.

Known cleanup from the upstream audit:

- `hiprint.printers` is not an upstream field. Printer fallback now reads
  `hiprint.hiwebSocket.printerList`.
- `setForcePageSize(printerName, value)` looked like a per-device API but
  HiPrint receives page size per print job. The public method is now global:
  `setForcePageSize(value)`.
- Raw `addPrintHtml({ options: { content } })` creates a default 90pt element
  in HiPrint. EasyInk now sets `top`, `left`, `width`, and `height` so rendered
  Viewer pages occupy the requested paper size.
- `print2` pass-through options such as `client`, `title`, `styleHandler`,
  `printByFragments`, `silent`, `color`, `dpi`, `duplexMode`, `pageRanges`,
  and custom `margins` are typed and forwarded.
