# SwipeActions

A phone row gesture. It wraps any row and reveals what each side will do while the finger moves; when the swipe passes the threshold it calls the handler the page gave it and springs back. It never confirms, deletes or opens anything itself.

## Props
- `left` and `right`, each optional: `{ label, icon, tone, onTrigger }`. Omit a side to make the row swipe one way only; pass the same action to both sides if both should do it.
- `disabled` for rows that can't swipe.

## How pages use it
- Transactions: right Approve (`brand`), left Delete (`danger`). The page shows its ConfirmDialog for Delete; Approve applies at once with an Undo Toast (RULES §5.7).
- Inbox: right Snooze until tomorrow, left Dismiss; both apply at once with Undo.
- The background under the row shows the side's icon and one-word label in its tone; past the threshold (40% of the row, or a fast flick) it fires once.

## Rules
- No tap action of its own: a tap goes to the row.
- Vertical scrolling wins until the finger moves sideways (`touch-action: pan-y`).
- Every swipe action is also reachable from the row's detail; gestures are shortcuts.

## Built from
A shared `useSwipe` hook (pointer tracking, threshold, spring back) and Icon. The row inside is the page's (TransactionRow, ListRow).

## Variants
- Both sides; right only; left only; disabled.
