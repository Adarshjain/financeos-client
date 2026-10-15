# Toast

A Banner that floats at the bottom of the screen after an action, for about 5 seconds, with Undo when the action can be reversed.

## Tones
The same as Banner, so a toast reads the same as an inline message: `neutral` (the default: "Snoozed until Wed 14 Oct"), `success`, `danger` ("Couldn't snooze. The row is back."), `warning`, `info`. Floating adds `shadow-pop`.

## Use
- Says what happened, with the object: "Marked ₹20,000 paid · ₹13,900 still due", "Dashboard deleted".
- Undo for snooze, dismiss, mark paid and other reversible actions; the row leaves at once and Undo puts it back.
- One toast at a time, above the tab bar on phone, bottom centre on desktop.
- No icon.

## Toaster
- `Toaster` is the one mount point for new-system toasts: bottom centre, above the TabBar on phone (`bottom-safe-12` plus the bar), a single toast at a time. It is a separate Sonner toaster (`id="ds"`); `showToast` always targets it, so new toasts never appear in the old app's top-centre toaster and old toasts never appear in the new one. New layouts mount `<Toaster />` once.

## Built from
Banner (tones and layout), Sonner (queue and timing), Button `link` (Undo).

## Don't
- Don't use a toast for something the user must act on; use a Banner or the Inbox.

## Variants
- Neutral, success, danger, warning, info; with Undo.
