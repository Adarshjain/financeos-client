# SwipeActions

Phone row gestures on lists that need triage (Transactions with Needs review on).

## Use
- Swipe right: Approve (`brand` fill with `on-brand` text). On a row that needs no approval it does nothing and springs back.
- Swipe left: Delete (`danger`), followed by an undo snackbar, not a dialog.
- The revealed panel is 96px wide with an icon and a one-word label.
- Every swipe action is also reachable from the row's detail sheet; gestures are shortcuts, never the only way.

## Variants
- Transactions: right Approve, left Delete. Inbox: right Snooze until tomorrow, left Dismiss.
