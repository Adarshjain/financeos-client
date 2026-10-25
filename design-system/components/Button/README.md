# Button

Buttons: one primary per view, secondary for everything else, ghost for low-emphasis icon actions, danger for destructive ones.

## Props
- `variant`: `'primary'` | `'secondary'` | `'danger'` | `'danger-filled'` | `'ghost'` | `'link'` | `'danger-link'` (default `'secondary'`)
- `size`: `'sm'` | `'md'` | `'xl'` (default `'md'`)
- `layout`: `'inline'` | `'stacked'` (default `'inline'`)
- `fullWidth`: `boolean` (default `false`)
- `iconOnly`: `boolean` (default `false`)
- `loading`: `boolean` (default `false`)
- `loadingLabel`: `ReactNode`
- `count`: `number | string`
- `dot`: `boolean` (default `false`; for icon-only buttons, draws a danger Badge `dot` at the top-right corner, absolutely positioned, never changing the button's size)
- `icon`: `ReactNode`
- `asChild`: `boolean` (default `false`)

## Variants
- `btn` secondary (default): `bg-surface` with a `line-strong` border.
- `btn-p` primary: `brand` fill, `on-brand` text. One per screen or sheet: "Save", "Save & apply", "Approve 2 rules".
- `btn-d` danger: `danger` text and `danger-border`. Starts a destructive action; always followed by a confirm step.
- `btn-dd` danger filled: `danger` fill. Only the final button of a ConfirmDialog ("Delete statement").
- `btn-g` ghost: no border; icon actions in bars and cards.
- Beside button text pass `size="xs"` (10px) on the Icon. Icon-only buttons keep their size. Link with icon: gap `space-2`.
- `btn-i` square icon button; give it an `aria-label`.
- Icon button with dot: `iconOnly` + `dot` marks something unread (the notifications bell).
- `link`: inline text action with underline and no border. The underline is the light `line-heavy` colour (owner, 2026-10-20), shows at rest and disappears on hover. When the link holds an icon (via `icon` or an Icon child) the control becomes `inline-flex` and the control becomes `inline-flex justify-center` and icon + gap + text sit in one content-width wrapper whose `after:` element (`inset-x-0`, `h-px`, `bg-line-heavy`) draws the underline continuously, so a stretched link (`fullWidth`, equal-share footer row) never underlines its empty space; text-only links keep `text-decoration`; icon-only links have no underline.
- Link icons are always 2px smaller than the text: the link variant sizes every `svg` inside it to `size-icon-inline` (`calc(1em - 2px)`), whatever `size` the Icon was given, so it follows the surrounding Text.
- `danger-link`: a `link` in the `danger` text colour for Delete / Remove link actions (owner, 2026-10-23); same underline, sizes and icon handling (including the icon size below); hover `danger-hover`, pressed `danger-pressed`.
- Sizes: `btn-s` 26px inside rows and card headers (desktop), default 32px (`control-md`, the same as a form field), `btn-xl` 44px for auth.
- Type: every size uses the `label` style (12px); `link` inherits the surrounding size.
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
- Phone tap targets are at least 44px tall in sheets; `sm` (26px) is for dense rows.

## Built from
Icon, Badge (count, dot), Radix Slot (`asChild` for links).
