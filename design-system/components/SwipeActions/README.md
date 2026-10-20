# SwipeActions

Adds swipe to any component. It wraps exactly one child (a TransactionRow, a ListRow, a Card, anything) and reveals what each side will do while the finger moves; when the swipe passes the threshold it calls the handler the page gave it and springs back. It never confirms, deletes or opens anything itself, and the wrapped component knows nothing about it.

## Props
- `left` and `right`, each optional: `{ label, icon, tone, onTrigger }`. Omit a side to make the row swipe one way only; pass the same action to both sides if both should do it.
- `disabled` for rows that can't swipe.
- No preset actions: Approve, Delete, Snooze and Dismiss are what pages pass, not options built into the component.

## How pages use it
- Transactions: right Approve (`brand`), left Delete (`danger`). The page shows its ConfirmDialog for Delete; Approve applies at once with an Undo Toast (RULES §5.7).
- Inbox: right Snooze until tomorrow, left Dismiss; both apply at once with Undo.
- The background under the row shows the side's icon and one-word label in its tone; past the threshold (pixels, default 96px) it fires once.

## Composition
- The page wraps whatever should swipe: `<SwipeActions left={…} right={…}><TransactionRow …/></SwipeActions>`. No component has `swipeable`, `swipeLeft`, `swipeRight` or similar props, and no component wraps itself in SwipeActions.
- It adds nothing to the child's look except a `surface` fill under the moving row, so a row without its own background (ListRow) hides the reveal at rest and while dragging (owner, 2026-10-20). No padding, border or radius. The child keeps its own background (selected tint included) on top of that fill. The child's corner radius is matched by the reveal layer (`className` on SwipeActions for layout, e.g. `rounded-ds-lg` when wrapping a card).
- The gesture itself is the shared `useSwipe` hook, exported, so a component with a layout SwipeActions can't wrap can use the same behaviour.
- No domain props: no `variant` ('transactions' | 'inbox'), no `onApprove` / `onDelete` / `onSnooze` / `onDismiss` / `canApprove`, no aliases. Spring-back uses `duration-base`.

## Rules
- Phone layout only (below `desk`), with touch or mouse; in the desktop layout it never swipes (owner, 2026-10-18).
- No tap action of its own: a tap goes to the row.
- Vertical scrolling wins until the finger moves sideways (`touch-action: pan-y`).
- Every swipe action is also reachable from the row's detail; gestures are shortcuts.

## Built from
The shared `useSwipe` hook (pointer tracking, threshold, spring back) and Icon. The child is whatever the page passes.

## Variants
- Both sides; right only; left only; disabled; wrapping a ListRow and a Card (stories show both).
