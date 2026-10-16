# ListRow

Rows inside cards. `row` is a flexible line (leading mark, a text block that grows, trailing value or action). `ListField` is a label/value pair for detail views and read-only values.

## Use
- Primary line `body-strong`, secondary line in `ink-3`.
- Trailing amounts are right-aligned, tabular, 700; credits are `positive` with a + sign.
- Highlighted: a row opened from a notification scrolls into view on `brand-tint` with the 4px `brand` stripe at its left, the same as a selected row. No outline, so nothing is clipped by the card's corners.

## Links
- A row that navigates is a link: `<ListRow asChild><Link href=…/></ListRow>` (Radix Slot). The row keeps its own look; the page never wraps it in a styled anchor.

## Built from
Avatar (leading avatar and icon tile), DateTile (leading date), Badge, Icon (chevron, kebab), Button (trailing action), Menu (kebab).

## Variants
- Leading: badge, date tile, avatar, icon tile or nothing. Trailing: action, amount, chevron, kebab. Highlighted, ListField (label/value), disabled.
