# Tabs

A tab strip that switches between sibling views of one section (All · Rules · Categories · Import).

## Use
- Tabs never wrap: on phone the strip scrolls sideways and bleeds to the screen edges.
- Put counts in the label only when they help decide where to go ("Tradebook · 38").
- The active tab is `brand-strong` text with a 2px `brand` underline.

## Don't
- Don't use tabs for filters on the same data; that is what filter chips are for.
- Don't put a Settings tab on an object page; settings belong in its edit sheet.

## Underline
- The current tab's underline is a straight 2px `brand` bar the full width of the label: square ends, no radius. The tab itself has no rounded corners.

## Built from
Radix Tabs; the count after a label is `ink-3` text, not a bubble. Active styling uses Radix state (`data-active:`).

## Props
- Root: `items` (array of `{ value, label, count?, disabled? }`), `value`, `defaultValue` (defaults to first item, pass `""` for no initial selection), `onValueChange`, standard Radix Tabs props.
- TabsList: standard Radix Tabs.List props (roving focus and arrow keys handled natively by Radix).
- TabsTrigger: `value`, `count`, `disabled`, children.
- TabsContent: `value`, children (no opinionated vertical padding).

## Variants
- Plain, with counts, and scrolling (never wrapping) when they overflow on phone.
