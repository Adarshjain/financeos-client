# Root

The top of every Dinero page tree. A layout renders `<Root>` once around its children; it gives the page the Dinero ground and mounts the Dinero Toaster, so no layout or page paints its own background, font or text colour.

## What it does
- Fills the viewport (`min-h-dvh`) with `bg-canvas`, sets Figtree (`font-text`) and `ink` text for everything inside.
- Mounts the Dinero `Toaster` (id `ds`) once.
- Nothing else: no navigation, no padding. The signed-in shell (Rail, TopBar, TabBar) sits inside it.

## Props
- `children`: `ReactNode` (page content)

## Built from
Toast (`Toaster`).

## Variants
- One (Default).