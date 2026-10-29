# ListRow

Rows inside cards. `row` is a flexible line (leading mark, a text block that grows, trailing value or action). `ListField` is a label/value pair for detail views and read-only values.

## Props
- `wrap?: boolean` (default `false`; title and subtitle wrap instead of truncating, long words break; trailing keeps its width and stays vertically centred)
- `flush?: boolean` (default `false`; drops the side gutter and the transparent left rail, for a row whose container already pads it)

## Use
- Primary line `body-strong`, secondary line in `ink-3`.
- Trailing value or action is right-aligned. The app formats any money strings or numbers and passes them via `trailing` (e.g. `<Text tone="positive">+₹15,000</Text>`).
- Highlighted: a row opened from a notification (or the current row, as in SearchPalette) scrolls into view on `brand-tint`, the same as a selected row. No stripe (owner, 2026-10-26) and no outline.

## Links
- A row that navigates is a link: `<ListRow asChild><Link href=…/></ListRow>` (Radix Slot). The row keeps its own look; the page never wraps it in a styled anchor.

## Built from
Avatar (leading avatar and icon tile), DateTile (leading date), Badge, Icon (chevron, kebab), Button (trailing action), Menu (actions dropdown menu).

## Variants
- Leading: badge, date tile, avatar, icon tile or nothing. Trailing: action, trailing node, chevron, actions menu. Highlighted, disabled, wrap (owner, 2026-10-20), flush.

## Hidden amounts
Under a `ConcealProvider` with `concealed`, each ₹ amount in title, subtitle and trailing reads "₹ —". See Conceal.
