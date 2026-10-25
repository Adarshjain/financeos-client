# WidgetGrid

The dashboard layout: items flow in order across a 12-column grid, each with a width step. Height always fits the content; nothing clips. In edit mode the user drags items to reorder and resizes them by their corner. It holds no content of its own; the page supplies the items (Widget, KpiTile) and the layout state.

## Props
- `items: { id, width, resizable?, children, editActions?, label? }[]` (`width` is used when the item is not in the layout; `resizable: false` keeps the width and hides the resize handle; `editActions` is a top-right slot that stays interactive while editing; `label` names the item in the drag and resize labels; `interactive: true` keeps the item's content usable while editing, default false)
- `layout?: { id, width }[]` / `defaultLayout?` / `onLayoutChange?(layout)` (order and width; items not listed follow in the order given; ids with no item are ignored)
- `editing?: boolean`
- `footer?: ReactNode` (full-width slot after the last item)
- `dragLabel?` / `resizeLabel?` (defaults "Drag to reorder" / "Resize"; the item's label follows)
- Native div props and `className` (layout only); the ref goes to the root.
- Also exported: `WidgetGridWidth`, `WIDGET_GRID_WIDTHS`, `widgetGridSpan(width)`, `widgetGridWidthFromFraction(fraction)`, `widgetGridWidthFromColumns(columns, total = 100)`.

## Variants
- Width steps (owner, 2026-10-25): `quarter`, `third`, `half`, `two-thirds`, `three-quarters`, `full`. Desktop (`desk:`): 12 columns, spans 3, 4, 6, 8, 9, 12. Phone (owner, 2026-10-25, reverses "2 columns"): one column, every widget full width whatever its desktop step. Order is always kept (no dense packing); a row is as tall as its tallest item and the items stretch to it.
- View: items only.
- Edit: each item shows a drag grip top-left and its `editActions` top-right; on desktop (`desk:` and up; phone is one column so there is nothing to resize) a resize handle sits at the bottom-right corner (none on phone, none when `resizable: false`). Item content is inert while editing, except an `interactive` item (a section header with its title field).
- Stacking and overflow: every item is its own stacking context (`isolate`), so other items' grips, handles and actions never draw over the one being dragged; the dragged item is `z-sticky` with `shadow-level-3`, under the tab bar and other `z-floating` chrome. All tracks are `minmax(0, 1fr)` (grid and each item's content grid), so wide content shrinks instead of widening the page, and a dragged item is clamped to the grid sideways.
- Drag: press the grip and move; the item follows the pointer and the others show where it will land; release commits, Escape or a cancelled pointer restores. The page scrolls when the pointer is near the top or bottom edge.
- Resize: drag the corner; the width snaps live to the nearest step by pointer position against the grid width; release commits.
- States: view, edit, with a non-resizable header item, with footer.

## Built from
Button (secondary, sm, icon-only: grip and handle), Icon (`grip`, `resize-corner`), `cn`, `useControllableState`.

- In edit mode each item's frame has an opaque `bg-surface`, so a dragged item is a solid lifted card and the items it passes over do not show through.
