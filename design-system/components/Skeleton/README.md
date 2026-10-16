# Skeleton

Loading placeholders shaped like the content they stand for: grey bars in `line-soft` at the heights of the text they replace.

## Use
Show for loads over about 300ms. Keep the real layout (card header, rows) so nothing jumps when data arrives. Respect reduced motion: no shimmer.

## Props
- `width?: string | number`: width of the placeholder (default 100%).
- `height?: string | number`: height of the placeholder (default 12px for bars).
- `circle?: boolean`: whether the skeleton is circular (e.g. for avatars).
- Plus native `<div>` attributes and ref forwarded to the root element (`aria-hidden="true"`).

## Built from
Nothing else.

## Variants
- Bar, circle, figure.
