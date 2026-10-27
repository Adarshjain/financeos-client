# FilterBar

The search and filter row of a list page (owner, 2026-10-27): the search field first, then the filter chips and dropdown chips, in one row that scrolls sideways when it overflows.

## Props
- `search?: { value, onValueChange, placeholder? }`: the search field; placeholder defaults to "Search". Without it the row is chips only.
- `size?: 'sm' | 'md'`: default `'sm'`. Mirrors FilterChip's `size`; pass the same value the chips use so the search field is as tall as they are (sm 28px, md 32px).
- `children`: FilterChips (default `pill` shape, never `rounded`) and dropdown chips.

## Bleed
The row carries its own padding and negative margins (phone: `-mx-space-16 px-space-16`, desktop: `-mx-space-4 px-space-4`, `py-space-4` with `-mt-space-4 -mb-space-4` / `desk:-mb-space-12`, so on phone the row nets 8px to its neighbours under the 8px parent gap) and hides its scrollbar, so the search field's focus ring is not clipped by the row's horizontal scroll while the row stays in place on the page. Pages pass no class for this.

## Variants
- With search, empty (phone: narrow `space-96` field).
- With search, focused or holding text (phone: grows to `container-viewport-inset`, about 90% of the viewport; animates with `duration-base`).
- Chips only.
- Desktop: a fixed `container-xs` field, no resizing.

## Built from
TextField (search, clearable, `shape="pill"` so it matches the chips' height and radius at the bar's `size`), Icon, FilterChip.
