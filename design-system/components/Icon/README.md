# Icon

The one way to draw an icon in the new system: a Phosphor icon in the bold weight, picked by its name from the icon registry, at a token size, in `currentColor`. The old UI keeps Lucide until it is deleted in Phase 4; nothing new uses Lucide.

## Registry
`design-system/icons.json` lists every icon the system may use: our name (`close`, `chevron-down`, `delete`…), the Phosphor icon behind it, and where it is used. Components ask for the name (`<Icon name="close" />`), never a Phosphor or Lucide component, so the set stays small and consistent and a future swap is one file. A new icon is added to the registry with the owner's approval first.

## Props
- `name: IconName`: the name from the icon registry.
- `size?: 'xs' | 'sm' | 'md' | 'lg'`: token size (default `md`).
- `className?: string`: layout classes.

## Sizes
- `xs` 10px (`icon-xs`): icons beside button text (Button applies it itself).
- `sm` 14px (`icon-sm`): chips, field carets, small buttons, inline with 12–13px text.
- `md` 16px (`icon-md`): buttons, bars, rows, menu items.
- `lg` 20px (`icon-lg`): phone tab bar, desktop rail, selection bar.

## Rules
- Weight is always bold: it matches the 700–800 type; regular reads spindly at 14–16px.
- Never type a glyph as an icon (▾ ✕ ✓ › ‹).
- Every icon in one control is the same size.
- Icons only where they are a control, navigation or progress (RULES §6).
- Works in server and client components (Phosphor's SSR entry, no icon context).

## Built from
`@phosphor-icons/react` (SSR entry); the registry in `design-system/icons.json`; sizes from the `icon-*` tokens.

## Variants
- Sizes xs, sm, md, lg; every registry icon.
