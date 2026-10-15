# TabBar

The phone tab bar: Home · Inbox · Upcoming · Transactions · More, always in that order.

## Use
- Shown on every top-level phone screen; hidden while a list is in selection mode (the selection bar takes the bottom edge) and under the keyboard.
- Count bubbles: `danger` for things that need you now (Inbox), `warning` for the review count on Transactions. Over 99 shows "99+".
- The active tab uses `brand-strong` for icon and label. Icons are `lg` (20px) from the registry, labels use `tab-label`.

## Don't
- Don't add a sixth tab or reorder; new sections go under More.
- Don't use a count bubble for information that needs no action.

## Built from
Icon, Badge (count). Items are links with the current one marked.
