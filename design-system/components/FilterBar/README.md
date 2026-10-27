# FilterBar

The search and filter row of a list page (owner, 2026-10-27): the search field first, then the filter chips and dropdown chips, in one row that scrolls sideways when it overflows.

## Props
- `search?: { value, onValueChange, placeholder? }`: the search field; placeholder defaults to "Search". Without it the row is chips only.
- `children`: FilterChips (default `pill` shape, never `rounded`) and dropdown chips.

## Variants
- With search, empty (phone: narrow `space-96` field).
- With search, focused or holding text (phone: grows to `container-viewport-inset`, about 90% of the viewport; animates with `duration-base`).
- Chips only.
- Desktop: a fixed `container-xs` field, no resizing.

## Built from
TextField (search, clearable), Icon, FilterChip.
