# Icon

The one way to draw an icon: a Lucide icon at a token size, 2px stroke, `currentColor`.

## Sizes
- `sm` 14px (`icon-sm`): inside chips, field carets, small buttons, inline with 12–13px text.
- `md` 16px (`icon-md`): buttons, bars, rows, menu items.
- `lg` 20px (`icon-lg`): phone tab bar, desktop rail, selection bar.

## Rules
- Never type a glyph as an icon (▾ ✕ ✓ › ‹). Use ChevronDown, X, Check, ChevronRight, ChevronLeft.
- Every chevron, × and ✓ in one control is the same size. A chip's caret and its remove × are both `sm`.
- Icons only where they are a control, navigation or progress (RULES §6).

## Built from
`lucide-react`; sizes from the `icon-*` tokens.

## Variants
- Sizes sm, md, lg.
