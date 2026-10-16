# Button

Buttons: one primary per view, secondary for everything else, ghost for low-emphasis icon actions, danger for destructive ones.

## Props
- `variant`: `'primary'` | `'secondary'` | `'danger'` | `'danger-filled'` | `'ghost'` | `'link'` (default `'secondary'`)
- `size`: `'sm'` | `'md'` | `'xl'` (default `'md'`)
- `layout`: `'inline'` | `'stacked'` (default `'inline'`)
- `fullWidth`: `boolean` (default `false`)
- `iconOnly`: `boolean` (default `false`)
- `loading`: `boolean` (default `false`)
- `loadingLabel`: `ReactNode`
- `count`: `number | string`
- `icon`: `ReactNode`
- `asChild`: `boolean` (default `false`)

## Variants
- `btn` secondary (default): `bg-surface` with a `line-strong` border.
- `btn-p` primary: `brand` fill, `on-brand` text. One per screen or sheet: "Save", "Save & apply", "Approve 2 rules".
- `btn-d` danger: `danger` text and `danger-border`. Starts a destructive action; always followed by a confirm step.
- `btn-dd` danger filled: `danger` fill. Only the final button of a ConfirmDialog ("Delete statement").
- `btn-g` ghost: no border; icon actions in bars and cards.
- `btn-i` square icon button; give it an `aria-label`.
- `link`: inline text action with underline and no border.
- Sizes: `btn-s` 26px inside rows and card headers (desktop), default 32px, `btn-xl` 44px for phone sheet footers and auth.
- Layout: `inline` (default) or `stacked` (icon above label at 64px height, for quick-action cards).

## States
Every variant has all six, and each must be visible:
- **Hover**: secondary and ghost `bg-hover`; primary `brand-hover`; danger outline `danger-tint`; danger filled `danger-hover`.
- **Pressed** (while the pointer or key is down): one step further than hover: secondary and ghost `bg-pressed`; primary `brand-pressed`; danger outline `danger-tint` with a `danger` border; danger filled `danger-pressed`. Pressed must differ from hover.
- **Focus** (keyboard only, `:focus-visible`): 2px `focus-ring` outline with a 2px offset. A mouse click shows pressed, not the focus ring.
- **Disabled**: 45% opacity, no hover or pressed.
- **Loading**: the `spinner` icon (Phosphor circle-notch, the one animated icon) takes the leading icon's place and rotates; no other icon is ever spun. The label stays (or becomes the `loadingLabel`), the button keeps its width, and it ignores clicks.

## Copy
Name the action with a verb and its object: "Mark paid", "Upload statement", "Approve 9". Never "OK" or "Submit".

## Don't
- Don't put a create button ("New category") in a page header; the + in the TopBar does that.
- Don't put two primary buttons side by side.
- Phone tap targets are at least 44px tall in sheets; 32px is fine inside dense rows.

## Built from
Icon, Badge (count), Radix Slot (`asChild` for links).
