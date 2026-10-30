# Icon

The one way to draw an icon in the new system: a Phosphor icon in the bold weight, picked by its name from the icon registry, at a token size, in `currentColor`. The old UI keeps Lucide until it is deleted in Phase 4; nothing new uses Lucide.

## Registry
`design-system/icons.json` lists every icon the system may use: our name (`close`, `chevron-down`, `delete`…), the Phosphor icon behind it, and where it is used. Components ask for the name (`<Icon name="close" />`), never a Phosphor or Lucide component, so the set stays small and consistent and a future swap is one file. A new icon is added to the registry with the owner's approval first: add it to `design-system/icons.json`, then run `node design-system/tools/gen-icons.mjs` (writes `src/components/ds/Icon/icons.generated.ts`; never edit it by hand).

## Props
- `name: IconName`: the name from the icon registry.
- `size?: 'xs' | 'sm' | 'md' | 'lg'`: token size (default `md`).
- `className?: string`: layout classes.

## Sizes
- `xs` 10px (`icon-xs`): icons beside button text (pass `size="xs"`).
- `sm` 14px (`icon-sm`): chips, field carets, small buttons, inline with 12–13px text.
- `md` 16px (`icon-md`): buttons, bars, rows, menu items.
- `lg` 20px (`icon-lg`): phone tab bar, desktop rail, selection bar.
- Inside a `link` / `danger-link` Button the size is not chosen here: Button sets `icon-inline` (`calc(1em - 2px)`, 2px under the text) on every icon in it.

## Rules
- Weight is bold (owner 2026-10-27: duotone tried and reverted). `weight="fill"` only for a status mark (owner, 2026-10-20: no-bank `warning`).
- Never type a glyph as an icon (▾ ✕ ✓ › ‹).
- Every icon in one control is the same size.
- Icons only where they are a control, navigation or progress (RULES §6).
- Works in server and client components (plain inline SVG from generated data; Phosphor is a generator-only dependency).

## Built from
`@phosphor-icons/react` (generator only, via `gen-icons.mjs`); the registry in `design-system/icons.json`; sizes from the `icon-*` tokens.

## Variants
- Sizes xs, sm, md, lg; every registry icon.
