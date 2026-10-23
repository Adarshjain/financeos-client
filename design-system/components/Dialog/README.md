# Dialog

The one overlay for forms, details, pickers and confirmations. It replaces Sheet and ConfirmSheet: the same component is a centred modal on desktop and a bottom sheet on phone, chosen by CSS at the `desk` breakpoint. Pages never choose between them.

## Forms
- **Desktop modal**: centred, `radius-xl`, `shadow-dialog`, × at the top right, footer right-aligned on `bg-sunken`. Widths `dialog-sm` 440, `dialog-md` 640, `dialog-lg` 760, `dialog-xl` 920. Opens with a fade and a small scale (`dur-base`) and closes with the reverse.
- **Phone sheet**: full width, `radius-sheet` top corners, drag handle, no ×; swipe down or tap the scrim to close; slides up with `dur-sheet` and slides back down the same way when it closes, from wherever a drag left it; the scrim fades in and out with it. Footer pinned, buttons share the row at the standard control height (`control-lg`, 36px) with tight vertical padding and the bottom safe-area inset, primary on the right.
- **Side panel** (desktop detail): desktop: a card (border, radius-lg, no shadow) inset by the page gutter; the page sets its top through `className`, which lands on the positioned element (owner 2026-10-22). Used where the boards open a row's detail beside the list. Non-modal on desktop: no backdrop, the list behind stays usable (scroll, click), Escape and × close it, and a click on another row swaps the detail without closing. The page reserves room beside the list while it is open; the panel does not push content. On phone it is the sheet with its backdrop.

## Layers and keyboard
- Backdrop and panel share one layer (`z-overlay`) and stack by portal order, so a dialog opened over another (a ConfirmDialog over the transaction detail) has its own backdrop above the one underneath: it dims it and blocks taps on it. A single dialog looks the same as before.
- Phone: the sheet keeps its size and position when the on-screen keyboard opens (the root viewport sets `interactiveWidget: 'resizes-visual'`), so the keyboard covers the footer instead of the footer riding above it. The footer stays rendered.

## Anatomy
Title and optional description, a body that is the only scroller, and a footer from props: up to three actions as data (`primary`, `secondary`, `tertiary`). Dialog draws the buttons itself in one row, left to right: tertiary, secondary, primary. Only primary is filled (`primary` or `danger-filled` when `destructive`); secondary and tertiary are `link`. On phone the actions present share the row in equal columns at `control-lg` height; on desktop they keep their natural width at `control-lg` height, aligned right. Props are `primary?: DialogPrimaryAction`, `secondary?: DialogAction`, `tertiary?: DialogAction` (no aliases).

## Footer Actions API
- `DialogAction`: `{ label: React.ReactNode; onSelect?: () => void; type?: 'button' | 'submit'; form?: string; disabled?: boolean; loading?: boolean }`
- `DialogPrimaryAction`: extends `DialogAction` with `destructive?: boolean`

## Background
`background`: `surface` (default) or `canvas`. Use `canvas` when the body is made of tiles or cards that carry their own `surface` and border, so they stand out from the sheet. The More sheet (`P-more`) is the one use today. Pages never recolour a Dialog with `className`.

## ConfirmDialog
The preset for destructive or hard-to-undo actions (delete a transaction, statement, account, dashboard, rule; discard edits). Title names the object ("Delete Swiggy Bangalore · ₹1,249?"), description and children explain impact with preview loading state, then Cancel and the confirm action repeating the verb; the action's label is a required prop. `tone` defaults to `'danger'` or accepts `'default'` for non-destructive actions. Offer the gentler option via `alternativeLabel` ("Close instead").

## Props
- `Dialog`: `variant` (`modal` | `side-panel`; `side-panel` makes it non-modal), plus `open`, `defaultOpen`, `onOpenChange`.
- `DialogShell`: `variant` (`modal` | `side-panel`), `size` (`sm` | `md` | `lg` | `xl`), `background` (`surface` | `canvas`), `title`, `description`, `showClose`, `srTitle`, `onClose`, `primary` (`DialogPrimaryAction`), `secondary` (`DialogAction`), `tertiary` (`DialogAction`), `dismissible`. `DialogContent` takes the same props except `variant`, which it reads from `Dialog`, and adds `animated` (default `true`; `false` drops the slide/zoom on open and the exit animation, the panel only fades in and goes at once; for an open that another animation carries, such as a shared-element morph from a row).
- `ConfirmDialog`: `title`, `description`, `children`, `confirmLabel`, `cancelLabel`, `alternativeLabel`, `onConfirm`, `onCancel`, `onAlternative`, `tone` (`danger` | `default`), `loading`, `previewLoading`, `loadingText`, `trigger`, `open`, `defaultOpen`, `onOpenChange`.

## Built from
Radix Dialog, Button, Icon, the shared `useSheetDrag` hook.

## Variants
- Desktop sizes sm, md, lg, xl; phone sheet; side panel; with tertiary; canvas background; non-dismissible (`dismissible={false}`); ConfirmDialog (tone danger/default, with preview, loading, alternative option).
