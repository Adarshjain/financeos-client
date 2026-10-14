# ListRow

Rows inside cards. `row` is a flexible line (leading badge or avatar, text block that grows, trailing value or action). `fld` is a label/value pair for detail sheets.

## Use
- Primary line `body-strong`, secondary line `cs` in `ink-3`.
- Trailing amounts are right-aligned, tabular, 700 weight; credits are `positive` with a + sign.
- Detail sheets list facts as `fld` rows: label in `ink-3` on the left, value on the right.
- Highlighted (`hl`): a row opened from a notification scrolls into view with a 2px `brand` outline on `brand-tint`.

## Variants
- Leading: badge, date tile, avatar, icon tile or nothing. Trailing: action, amount, chevron, kebab. Plus highlighted, label/value and disabled rows.
