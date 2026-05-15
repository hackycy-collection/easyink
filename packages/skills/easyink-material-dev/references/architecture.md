# EasyInk Material Architecture

## Core Chain

Material work spans this chain:

```text
Designer material catalog
  -> createDefaultNode(partial?, unit?)
  -> schema.elements[]
  -> MaterialDesignerExtension.renderContent()
  -> viewer.open({ schema, data })
  -> Viewer binding projection and measure pass
  -> MaterialViewerExtension.render()
  -> print and export reuse Viewer DOM
```

If one link is missing, the failure mode is usually direct: no Designer registration means it cannot be dragged in; no Viewer registration means `[Unknown: type]`; no stable default node means drag and auto-create paths produce blank or invalid templates.

## State Boundaries

- Schema state lives in `DocumentSchema` and `MaterialNode`: persistent, undoable, imported/exported.
- Workbench state lives in Designer store: panels, zoom, selection, window layout, user preferences.
- Runtime state lives in Viewer and editing sessions: resolved props, page plan, font state, transient handles, drag gestures.

Do not move transient runtime details into Schema. Examples to keep out of Schema: active cell selection, pointer gesture state, virtual preview rows, handle positions, measured layout caches, DOM refs, and active editing metadata.

## Schema Shape

Use `packages/schema/src/types.ts` as source of truth:

- `MaterialNode` stores `id`, `type`, geometry, `props`, optional `binding`, `children`, `extensions`, and animation or print metadata.
- `BindingRef` stores datasource identity and `fieldPath`, plus optional format and `bindIndex`.
- `TableNode` adds `table: TableSchema`.
- `TableDataSchema` uses `kind: 'data'`, `topology`, `layout`, and optional `showHeader` or `showFooter`.
- `TableCellSchema.binding` is for `table-data` repeat-template cells.
- `TableCellSchema.staticBinding` is for fixed cells such as table-static cells or table-data header/footer cells.

## Designer Contract

The Designer material contract is in `packages/core/src/material-extension.ts`.

Implement `MaterialDesignerExtension` with:

- `renderContent(nodeSignal, container)`: mount the design-time content and subscribe to node changes.
- `datasourceDrop`: optional material-owned drag/drop binding logic.
- `geometry`: optional deep-edit hit testing and selection rectangle mapping.
- `selectionTypes`: optional sub-selection schema and payload validation.
- `behaviors`: optional middleware chain for pointer, key, drop, paste, and command events.
- `decorations`: optional Vue decorations for handles, guides, toolbars, or overlays.
- `resize`: optional material-private side effects during element resize.

`MaterialExtensionContext` provides `getSchema`, `getNode`, `getBindingLabel`, `commitCommand`, `tx`, `requestPropertyPanel`, event bus methods, zoom/page DOM access, and `t(key)`.

## Viewer Contract

The Viewer contract is in `packages/core/src/material-viewer.ts`.

Implement `MaterialViewerExtension` with:

- `render(node, context)`: return `{ html: trustedViewerHtml(...) }` or `{ element }`.
- `measure(node, context)`: optional pre-page-plan sizing for content-driven dimensions.
- `getRenderSize(node, context)`: optional wrapper size override.
- `pageAware`: replicate this material to every page with `__pageNumber` and `__totalPages`.

The Viewer pipeline validates schema, resolves bindings, runs `measure()`, creates a page plan, handles page-aware replication, and then calls each material renderer through `MaterialRendererRegistry`.

## Registration

Custom material hosts:

- Designer: call `registerMaterialBundle(store, bundle)` inside `EasyInkDesigner` `setupStore`.
- Viewer: call `viewer.registerMaterial(type, extension)`.

Built-in materials:

- Add package imports and entries in `packages/builtin/src/designer.ts`.
- Add Viewer registration in `packages/builtin/src/viewer.ts`.
- Add AI descriptor import and entry in `packages/builtin/src/ai.ts`.
- Add `@easyink/material-x` dependency to `packages/builtin/package.json`.

## Catalog and Capabilities

`DesignerMaterialRegistration` defines:

- `type`: stable Schema identity.
- `name`: display label or i18n key.
- `icon`: Vue icon component.
- `category`: primary material category.
- `capabilities`: controls binding, rotation, resizing, children, animation, union drop, page-aware, multi-binding, aspect lock.
- `createDefaultNode`: default schema factory.
- `factory`: Designer extension factory.
- `propSchemas`: material-owned property schemas appended to base registry.
- `sectionFilter`: hide or show property panel sections.

`quickMaterialTypes` creates quick toolbar entries. `groupedCatalog` creates grouped catalog entries for data, chart, svg, and utility groups.
