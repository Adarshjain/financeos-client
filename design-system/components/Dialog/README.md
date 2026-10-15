# Dialog

The one overlay for forms, details, pickers and confirmations. It replaces Sheet and ConfirmSheet: the same component is a centred modal on desktop and a bottom sheet on phone, chosen by the viewport. Pages never choose between them.

## Forms
- **Desktop modal**: centred, `radius-xl`, `shadow-dialog`, × at the top right, footer right-aligned on `bg-sunken`. Widths `dialog-sm` 440, `dialog-md` 640, `dialog-lg` 760, `dialog-xl` 920. Opens with a fade and a small scale (`dur-base`).
- **Phone sheet**: full width, `radius-sheet` top corners, drag handle, no ×; swipe down or tap the scrim to close; slides up with `dur-sheet`. Footer pinned, buttons full width (`control-xl`), primary on the right.
- **Side panel** (desktop detail): slides in from the right, full height, used where the boards open a row's detail beside the list. On phone it is the sheet.

## Anatomy
Title and optional subtitle, a body that is the only scroller, and a footer from props: `primary` and optional `secondary` (at most two). An optional `tertiary` destructive action ("Delete rule") sits at the far left of the desktop footer; on phone it moves to the end of the body as a full-width danger row under a danger SectionHeader, never squeezed into the footer.

## ConfirmDialog
The preset for destructive or hard-to-undo actions (delete a transaction, statement, account, dashboard, rule; discard edits). Title names the object ("Delete Swiggy Bangalore · ₹1,249?"), one or two sentences say what goes and what stays (with the server's preview and a loading line while it checks), then Cancel and the action in filled danger repeating the verb ("Delete statement"). The action is disabled while it runs. Offer the gentler option when there is one ("Close instead"). Discard confirms read "Keep editing" / "Discard".

## Built from
Radix Dialog, Button, Icon, SectionHeader (danger band), a shared drag hook for the sheet handle.

## Variants
- Desktop sizes sm, md, lg, xl; phone sheet; side panel; with tertiary; ConfirmDialog (with preview, loading, gentler option).
