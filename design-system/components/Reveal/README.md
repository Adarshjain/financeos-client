# Reveal

Shows and hides content with an animation instead of a pop: a field that slides in and out of its row when a condition changes.

## Props
- `open: boolean`: whether the content is shown.
- `axis?: 'x' | 'y'`: which size animates, height (`y`, default) or width (`x`).
- `children`: the content.
- Plus native `<div>` attributes (`className` for layout, e.g. `flex-1`) and ref forwarded to the root element.

## Behaviour
- The size animates between `0fr` and `1fr` of a one-cell grid, with opacity, over `dur-base`.
- Children stay mounted while closed; the root is `inert` and `aria-hidden` then, so they cannot take focus or clicks.
- No animation under `prefers-reduced-motion`.
- Content is clipped only while closed or animating; once fully open (after `transitionend`, or a short fallback when there is no transition) it is visible, so focus rings are not cut.
- Client component (`'use client'`) for that open-and-settled state; server pages can still render it.

## Variants
- Vertical (`axis="y"`), horizontal (`axis="x"`), open, closed.

## Built from
Nothing else.
