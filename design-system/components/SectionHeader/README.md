# SectionHeader

The header that starts a section inside a list, card or sheet. One component for the section divider looks the boards use; grouping the rows is the page's job, the header only draws the label.

## Variants
- **strong**: prominent group or day header (e.g. sticky list header, `text-label font-extrabold text-ink` on `bg-subtle`, `z-sticky`).
- **strong, sticky** (default for strong) is frosted glass: `bg-subtle` fallback, `glass:bg-glass glass:backdrop-blur-glass glass:backdrop-saturate-glass` where backdrop-filter is supported, so rows scrolling under it show through blurred. Non-sticky and band stay solid.
- **band**: a form section in a sheet or card, `overline` caption in `ink-4` on `bg-sunken`, bleeding to the edges.

- **With action**: a control (e.g. a link Button) at the right end of the row, after `meta`.

## Tone
- **neutral**: standard header styling.
- **danger**: destructive sections (e.g. Delete account), `text-danger`.

## Props
`as` ('div' | 'h2' | 'h3'), `variant` ('strong' | 'band'), `tone` ('neutral' | 'danger'), `children` (primary label), optional `meta` (weekday or summary), `action` (control at the row's right end, after meta, vertically centred), `sticky` (default true for strong), `borderTop` (default true for band).

## Built from
Nothing else; Card and Dialog bodies use it.

## Hidden amounts
Under a `ConcealProvider` with `concealed`, each ₹ amount in children reads "₹ —". See Conceal.
