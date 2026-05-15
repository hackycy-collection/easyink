# Binding, Viewer, Measurement, and Page-Aware Rules

## Binding Projection

Ordinary element binding is handled by Viewer before material render:

1. `ViewerRuntime.resolveAllBindings()` calls `projectBindings(node, data)`.
2. `applyBindingsToProps(props, projected, node.type)` maps projected values into props.
3. `renderPages()` passes `context.resolvedProps` and a `nodeForRender` whose `props` are the resolved props.

For standard materials, do not manually walk `context.data` in `render()`. Read `context.resolvedProps` or `getNodeProps(node)` after the Viewer pipeline has projected props.

Primary binding defaults:

- `text` maps binding 0 to `content`.
- `image` maps binding 0 to `src`.
- `barcode` and `qrcode` map binding 0 to `value`.
- Unknown types default to `content`.

Multi-binding requires explicit mapping in `binding-projector.ts` unless the material owns a custom schema such as table cell bindings.

## Datasource Drop

If whole-element binding is enough, rely on default Designer behavior.

Implement `datasourceDrop` when the material owns internal drop zones:

- `onDragOver(field, point, node)` returns accepted or rejected zone descriptors in material-local coordinates.
- `onDrop(field, point, node)` commits binding via `context.tx.run()`.
- Use `context.t()` for rejection labels.
- Validate row, cell, source, and collection compatibility before committing.

`table-data` uses this pattern to bind fields into cells. It rejects hidden rows and rejects repeat-template fields from a different collection prefix than existing repeat-template cells.

## Table-Data Runtime Expansion

`table-data` is special:

- Schema stores real structural rows only: header, one repeat-template row, optional footer.
- Designer may render virtual preview rows after the repeat-template row, but those are not Schema rows.
- Repeat-template cells use `cell.binding` with absolute slash paths such as `items/name`.
- Header/footer or fixed cells use `cell.staticBinding`.
- All repeat-template bindings in the same row should share the same collection prefix.

Viewer expansion:

1. Collect repeat-template cell binding paths.
2. Derive collection path with `extractCollectionPath()`.
3. Resolve the collection from runtime data.
4. Clone one row per array item.
5. Resolve each cell leaf field against the item.
6. Format via `formatBindingDisplayValue()`.
7. Report diagnostics with `nodeId` when formatting fails.

Empty or non-array data renders a single fallback row, not a schema mutation.

## Measurement

Implement `measure()` only when runtime content can change dimensions. Good examples:

- data table expands to N runtime rows.
- rich text expands with wrapped content.
- container grows based on children.

For fixed-size materials, omit `measure()`.

`table-data` measurement is the runtime source of truth:

- `measureTableData()` resolves visible runtime rows, computes baseline row heights from original schema height, runs auto-row-height calculation, caches the layout in a WeakMap keyed by `node.table`, and returns the runtime height.
- `renderTableData()` reuses the cached layout because Viewer has already overwritten `node.height` after measure.
- The cache is runtime-only and must not be serialized.

When implementing a new measured material:

- Do not mutate the source schema object from `measure()`.
- Return document-unit width and height.
- Report diagnostics through `context.reportDiagnostic`.
- Ensure `render()` uses the same layout assumptions as `measure()`.
- Consider `stack` page mode: measured sizes feed page planning and flow layout before final DOM render.

## Trusted Viewer HTML

Viewer string output must be wrapped:

```ts
return {
  html: trustedViewerHtml(html),
}
```

Use `trustedViewerHtml(html, 'sanitized-rich-text')` only when the material has already sanitized or internally generated the rich markup. Escape all user-controlled strings with `escapeHtml()` before interpolation.

## Page-Aware Materials

Set `pageAware: true` for materials that must repeat on every page, such as page numbers, watermarks, headers, and footers.

Viewer behavior:

- Page-aware elements are removed from their original page and copied into every page.
- Virtual IDs are generated as `originalId__p${page.index}`.
- Resolved props get `__pageNumber` and `__totalPages`.
- Label page mode does not support this replication.

Material renderers should read page-aware runtime values from `context.resolvedProps`.

## Exporter and Print Driver Boundary

Export and print layers are downstream of Viewer:

- `ViewerExporter` bridges Viewer context to an export runtime or direct Blob result.
- `ExportFormatPlugin` should focus on format conversion, not Viewer layout semantics.
- `PrintDriver` bridges Viewer-rendered pages and `printPolicy` to a device, gateway, SDK, DOM printer, PDF pipeline, or WebSocket protocol.
- Both should use `context.container?.querySelectorAll('.ei-viewer-page')` and `context.renderedPages` when they need pages.

Material developers should not add export-specific or print-specific rendering branches unless there is a deliberate Viewer output difference. Prefer making the normal Viewer DOM correct and printable.

Diagnostics and feedback matter in downstream validation:

- Export diagnostics should separate `viewer`, `exporter`, and runtime/plugin failures.
- Print drivers should call `onPhase`, `onProgress`, and `onDiagnostic` so material/render failures can be distinguished from device or protocol failures.
- Unit conversion belongs at the print-driver boundary; material schema sizes remain in document units.

## Render Size

Use `getRenderSize()` when wrapper dimensions should differ from schema `width` and `height`. This is uncommon; prefer normal width and height or `measure()` unless wrapper size must diverge at render time.

## Viewer Failure Handling

Viewer wraps material render through diagnostic middleware:

- Missing material type renders `[Unknown: type]`.
- Render errors produce a warning diagnostic and fallback placeholder.
- Measure errors are warnings and leave the original node size unchanged.

Tests should assert these fallback paths when adding risky runtime behavior.
