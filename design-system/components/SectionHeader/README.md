# SectionHeader

The header that starts a section inside a list, card or sheet. One component for the three looks the boards use; grouping the rows is the page's job, the header only draws the label.

## Variants
- **date**: the sticky day header on phone lists, "12 Oct" in 800 with the weekday in `ink-3`, on `bg-subtle`, `z-sticky`. Phone only; desktop tables keep a Date column.
- **band**: a form section in a sheet or card, `overline` caption in `ink-4` on `bg-sunken`, bleeding to the edges (Basics · Card details · Limit).
- **month**: the desktop list band "September 2026 · 61 transactions · out ₹1,05,219", `overline` on `bg-sunken`.
- **danger band**: the band that closes an edit sheet (Delete account), `danger` caption, followed by the destructive action row.

## Props
`variant`, `label`, optional `meta` (weekday or summary), `sticky` (date default on).

## Built from
Nothing else; Card and Dialog bodies use it.
