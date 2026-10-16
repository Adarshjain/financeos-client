# Dialog

The one overlay for forms, details, pickers and confirmations. It replaces Sheet and ConfirmSheet: the same component is a centred modal on desktop and a bottom sheet on phone, chosen by CSS at the `lg` breakpoint. Pages never choose between them.

## Forms
- **Desktop modal**: centred, `radius-xl`, `shadow-dialog`, × at the top right, footer right-aligned on `bg-sunken`. Widths `dialog-sm` 440, `dialog-md` 640, `dialog-lg` 760, `dialog-xl` 920. Opens with a fade and a small scale (`dur-base`) and closes with the reverse.
- **Phone sheet**: full width, `radius-sheet` top corners, drag handle, no ×; swipe down or tap the scrim to close; slides up with `dur-sheet` and slides back down the same way when it closes, from wherever a drag left it; the scrim fades in and out with it. Footer pinned, buttons full width (`control-xl`), primary on the right.
- **Side panel** (desktop detail): slides in from the right, full height, used where the boards open a row's detail beside the list. On phone it is the sheet.

## Anatomy
Title and optional subtitle, a body that is the only scroller, and a footer from props: `primary` and optional `secondary` (at most two). An optional `tertiary` destructive action ("Delete rule") sits at the far left of the footer. **The footer is the same on every screen size**: tertiary left, then secondary and primary on the right. On phone the buttons are `control-xl` tall and secondary and primary share the remaining width equally; nothing moves into the body. Props are exactly `primary`, `secondary` and `tertiary` (no aliases).

## Background
`background`: `surface` (default) or `canvas`. Use `canvas` when the body is made of tiles or cards that carry their own `surface` and border, so they stand out from the sheet. The More sheet (`P-more`) is the one use today. Pages never recolour a Dialog with `className`.

## ConfirmDialog
The preset for destructive or hard-to-undo actions (delete a transaction, statement, account, dashboard, rule; discard edits). Title names the object ("Delete Swiggy Bangalore · ₹1,249?"), one or two sentences say what goes and what stays (with the server's preview and a loading line while it checks), then Cancel and the action in filled danger repeating the verb ("Delete statement"); the action's label is a required prop, never a default. The action is disabled while it runs. Offer the gentler option when there is one ("Close instead"). Discard confirms read "Keep editing" / "Discard".

## Built from
Radix Dialog, Button, Icon, the shared `useSheetDrag` hook.

## Variants
- Desktop sizes sm, md, lg, xl; phone sheet; side panel; with tertiary; canvas background; ConfirmDialog (with preview, loading, gentler option).
