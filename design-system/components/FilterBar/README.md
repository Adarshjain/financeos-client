# FilterBar

The search and filter row of a list page (owner, 2026-10-27): the search field first, then the filter chips and dropdown chips, in one row that scrolls sideways when it overflows.

## Props
- `search?: { value, onValueChange, placeholder? }`: the search field; placeholder defaults to "Search". Without it the row is chips only.
- `children`: FilterChips (default `pill` shape, never `rounded`) and dropdown chips.

## Bleed
The row carries its own padding and negative margins (phone: `-mx-space-16 px-space-16`, desktop: `-mx-space-4 px-space-4`, `py-space-4` with `-mt-space-4 -mb-space-8` / `desk:-mb-space-12`) and hides its scrollbar, so the search field's focus ring is not clipped by the row's horizontal scroll while the row stays in place on the page. Pages pass no class for this.

## Variants
- With search, empty (phone: narrow `space-96` field).
- With search, focused or holding text (phone: grows to `container-viewport-inset`, about 90% of the viewport; animates with `duration-base`).
- Chips only.
- Desktop: a fixed `container-xs` field, no resizing.

## Built from
TextField (search, clearable), Icon, FilterChip.
