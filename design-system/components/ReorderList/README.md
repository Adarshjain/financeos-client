# ReorderList

An ordered list the user re-ranks with Move up and Move down buttons, one step at a time. No drag. Rows are ListRows, so it sits inside a Card or a Dialog body.

## Props
- `items: { id, title, subtitle?, trailing?, ariaLabel? }[]` (`ariaLabel` names the row in the move buttons when `title` is not plain text)
- `value?: string[]` / `defaultValue?: string[]` / `onValueChange?(ids: string[])` (item ids in order; items not listed follow in the order given, ids with no item are ignored)
- `labels?: { moveUp?: string; moveDown?: string }` (defaults "Move up" / "Move down"; the item's name follows each)
- Native div props and `className` (layout only); the ref goes to the root.

## Use
- Each row shows its 1-based position first, then title and subtitle. At its end sit the item's own `trailing` node, then the Move up and Move down buttons (so they land under the thumb on phone).
- Move up is disabled on the first row, Move down on the last.
- The row just moved is highlighted until another row moves, scrolls into view if needed, and slides to its new place. Keyboard focus stays on the same button, or on the other one when that button becomes disabled.

## Variants
- One look. States: default, with a trailing action, long list.

## Built from
ListRow (row, highlighted), Button (ghost, sm, icon-only), Icon (chevron-up, chevron-down), Text (position).
