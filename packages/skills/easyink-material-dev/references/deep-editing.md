# Deep Editing Rules

Use deep editing when the user edits sub-elements inside one material: table cells, SVG handles, internal anchors, shape control points, or material-local regions. Do not add deep editing for ordinary whole-element selection.

## Core Pieces

Deep editing uses these contracts from `packages/core/src/editing-session.ts` and `packages/core/src/material-extension.ts`:

- `MaterialGeometry`: content layout, hit testing, and selection-to-rectangle mapping.
- `SelectionType<T>`: payload validation, sub-property schema, selection rectangle mapping.
- `BehaviorRegistration`: middleware for pointer, keyboard, drop, paste, or command events.
- `SelectionDecorationDef`: Vue component rendered by `SelectionOverlay`.
- `TransactionAPI`: `tx.run()` and `tx.batch()` for undoable schema mutations.
- `EditingSessionRef`: active node, current selection, reactive metadata, dispatch, and `setMeta()`.

## Geometry Contract

`MaterialGeometry` must follow coordinate conventions:

- `getContentLayout()` and `resolveLocation()` return document/page coordinates.
- `hitTest(point, node)` receives material-local coordinates.
- Use `GeometryService.documentToLocal()` and `localToDocument()` when pointer or handle positions cross spaces.
- Include transforms when needed. For shape handles like `svg-star`, local handle positions are converted through rotation and scale before overlay placement.

Hit tests should return `null` for inert regions. Table-data returns `null` for virtual placeholder rows so preview-only rows are not editable.

## Selection Contract

Selection payloads must be JSON-safe and deterministic:

- Good: `{ row: 1, col: 2 }`, `{ handle: 'inner-radius', index: 0 }`.
- Bad: DOM node, function, class instance, PointerEvent, reactive ref.

Selection type IDs must be namespaced. Examples:

- `table.cell`
- `svg-star.control`

Implement `validate(payload)` for any payload shape that may come from restore, keyboard navigation, or middleware.

## Behaviors

Behaviors are Koa-style middleware:

- Use `eventKinds` to narrow input types.
- Use `selectionTypes` when a behavior only applies to sub-selections.
- Use `priority` to order framework and material behavior.
- Call `next()` when the event is not consumed.
- Stop DOM defaults where needed for keyboard navigation or pointer gestures.
- Mutate Schema through `ctx.tx.run()` only.

Framework helpers:

- `selectionMiddleware()` performs pointer hit-testing and updates selection.
- `keyboardCursorMiddleware()` lets Escape exit editing through the workbench fallback.
- `undoBoundaryMiddleware()` helps selection changes become natural history boundaries.

## History and Transactions

Use `tx.run(nodeId, draft => { ... }, options)`:

- `label`: use an i18n history key such as `designer.history.updateTableCell`.
- `mergeKey`: use for continuous drag or resize, such as `svg-star:inner-radius` or `resize-col-2`.
- `mergeWindowMs`: tune only when the default window is wrong.

Do not directly mutate the store from a decoration or toolbar. Decorations should dispatch commands to the session; behavior middleware should own schema mutation.

## Decorations

Use decorations for visual handles, guides, inline toolbars, and overlays:

- Register `decorations` on the material extension.
- Filter by `selectionTypes`.
- Keep rendering layer intentional: `below-content`, `above-content`, or `above-handles`.
- Component props include `{ rects, selection, node, session, unit }`.
- Use `session.dispatch()` to send commands and `session.setMeta()` for transient UI state shared with the decoration.

`svg-star` uses a decoration to render inner-radius handles and dispatches `svg-star.adjust-handle` while dragging. The behavior converts screen coordinates to material-local points and writes `starInnerRatio`.

## Sub-Property Schemas

Use `SelectionType.getPropertySchema()` when selected sub-elements need properties:

- Return a `SubPropertySchema`.
- Implement `read(key)` from the current node state.
- Implement `write(key, value, tx)` using `tx.run()`.
- Provide `binding`, `clearBinding`, and `updateBindingFormat` when the sub-selection owns binding.
- Use locale keys in `title` and labels.

`table-kernel/src/editing/cell-property.ts` is the model. It reads and writes cell typography, padding, border, and binding. It chooses `binding` for repeat-template rows and `staticBinding` for fixed rows.

## Inline Editors and Ephemeral Panels

Use `session.meta` or `SurfacesAPI.requestPanel()` for transient editor UI. Keep actual committed content in Schema.

For table cells:

- `Enter` or `F2` enters cell edit.
- `Delete` clears content text.
- `Tab` and arrow keys move between visible cells.
- `table-data` repeat-template cells cannot inline-edit content because they represent runtime data bindings.

## Resize Side Effects

Use `MaterialResizeAdapter` when element resize must update material-private layout:

- `beginResize(node)` captures original private state.
- `applyResize(node, snapshot, params)` mutates private fields during preview.
- `commitResize(node, snapshot)` returns a side effect with deterministic `apply()` and `undo()`.

The table resize adapter scales visible row heights during vertical resize and freezes hidden header/footer rows so re-showing them preserves proportions.

## Deep Editing Checklist

- Double-click enters editing; avoid pointerdown-only entry that steals normal selection/drag.
- Hit testing respects hidden rows, merged cells, handles, transforms, and preview-only regions.
- Selection payload validates.
- Property panel reflects sub-selection state.
- Keyboard behavior does not leak to canvas shortcuts while consumed.
- Drag/resize gestures clean up on unmount.
- Continuous edits have merge keys.
- Hiding/removing the selected sub-element exits or repairs the active session.
