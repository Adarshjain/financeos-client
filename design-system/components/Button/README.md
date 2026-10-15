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

## Copy
Name the action with a verb and its object: "Mark paid", "Upload statement", "Approve 9". Never "OK" or "Submit".

## Don't
- Don't put a create button ("New category") in a page header; the + in the app bar does that.
- Don't put two primary buttons side by side.
- Phone tap targets are at least 44px tall in sheets; 32px is fine inside dense rows.

## Google
- `google`: secondary look, full width, `control-xl` (44px), the Google "G" mark before "Continue with Google". The mark is Google's own multicolour artwork shipped as a static file (`public/brand/google-g.svg`) and shown with `<img>`, so no colour literal enters the code. Only on Sign in and Sign up.

## Built from
Icon, Badge (count), Radix Slot (`asChild` for links).

## Variants
- Variants: primary, secondary, danger outline (starts a destructive action), danger filled (final confirm), ghost.
- Sizes: small 26 (rows, card headers), default 32, phone 44 (sheet footers, auth).
- States: default, hover, focus ring, loading (label changes to the ongoing verb), disabled.
- Icon-only buttons always carry an aria-label; counts sit in a dark pill after the label.
