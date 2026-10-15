# Button

Buttons: one primary per view, secondary for everything else, ghost for low-emphasis icon actions, danger for destructive ones.

## Variants
- `btn` secondary (default): `bg-surface` with a `line-strong` border. Google (sign-in pages only).
- `btn-p` primary: `brand` fill, `on-brand` text. One per screen or sheet: "Save", "Save & apply", "Approve 2 rules".
- `btn-d` danger: `danger` text and `danger-border`. Starts a destructive action; always followed by a confirm step.
- `btn-dd` danger filled: `danger` fill. Only the final button of a ConfirmDialog ("Delete statement").
- `btn-g` ghost: no border; icon actions in bars and cards.
- `btn-i` square icon button; give it an `aria-label`.
- Sizes: `btn-s` 26px inside rows and card headers (desktop), default 32px, `btn-xl` 44px for phone sheet footers and auth.

## States
Every variant has all six, and each must be visible:
- **Hover**: secondary and ghost `bg-hover`; primary `brand-hover`; danger outline `danger-tint`; danger filled `danger-hover`.
- **Pressed** (while the pointer or key is down): one step further than hover: secondary and ghost `bg-pressed`; primary `brand-pressed`; danger outline `danger-tint` with a `danger` border; danger filled `danger-pressed`. Pressed must differ from hover.
- **Focus** (keyboard only, `:focus-visible`): 2px `focus-ring` outline with a 2px offset. A mouse click shows pressed, not the focus ring.
- **Disabled**: 45% opacity, no hover or pressed.
- **Loading**: a spinner replaces the leading icon, the label stays, the button ignores clicks.

## Link
- `link`: an inline text action inside a sentence, a Banner or a Toast ("Reconcile", "See them", "Undo"): `body-strong` weight, underlined, the surrounding text colour, no padding, no height, no border. It never makes its container taller.

## States
Every variant has all six, and each must be visible:
- **Hover**: secondary and ghost `bg-hover`; primary `brand-hover`; danger outline `danger-tint`; danger filled `danger-hover`.
- **Pressed** (while the pointer or key is down): one step further than hover: secondary and ghost `bg-pressed`; primary `brand-pressed`; danger outline `danger-tint` with a `danger` border; danger filled `danger-pressed`. Pressed must differ from hover.
- **Focus** (keyboard only, `:focus-visible`): 2px `focus-ring` outline with a 2px offset. A mouse click shows pressed, not the focus ring.
- **Disabled**: 45% opacity, no hover or pressed.
- **Loading**: a spinner replaces the leading icon, the label stays, the button ignores clicks.

## Link
- `link`: an inline text action inside a sentence, a Banner or a Toast ("Reconcile", "See them", "Undo"): `body-strong` weight, underlined, the surrounding text colour, no padding, no height, no border. It never makes its container taller.

## Copy
Name the action with a verb and its object: "Mark paid", "Upload statement", "Approve 9". Never "OK" or "Submit".

## Don't
- Don't put a create button ("New category") in a page header; the + in the TopBar does that.
- Don't put two primary buttons side by side.
- Phone tap targets are at least 44px tall in sheets; 32px is fine inside dense rows.

## Google
- `google`: secondary look, full width, `control-xl` (44px), the Google "G" mark before "Continue with Google". The mark is Google's own multicolour artwork shipped as a static file (`public/brand/google-g.svg`) and shown with `<img>`, so no colour literal enters the code. Only on Sign in and Sign up.

## Built from
Icon, Badge (count), Radix Slot (`asChild` for links).

## Variants
- Variants: primary, secondary, danger outline (starts a destructive action), danger filled (final confirm), ghost, link.
- Sizes: small 26 (rows, card headers), default 32, phone 44 (sheet footers, auth).
- States: default, hover, focus ring, loading (label changes to the ongoing verb), disabled.
- Icon-only buttons always carry an aria-label; counts sit in a dark pill after the label.
