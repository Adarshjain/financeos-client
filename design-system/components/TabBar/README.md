# TabBar

The phone bottom navigation. It draws the items the app gives it, in the order given; FinanceOS passes Home · Inbox · Upcoming · Transactions · More.

## Use
- Shown on every top-level phone screen; hidden while a list is in selection mode (the selection bar takes the bottom edge) and under the keyboard.
- Count bubbles: `danger` for things that need you now (Inbox), `warning` for the review count on Transactions. Over 99 shows "99+".
- The active tab uses `brand-strong` for icon and label. Icons are `lg` (20px) from the registry, labels use `tab-label`.

## Don't
- Don't add a sixth tab or reorder; new sections go under More.
- Don't use a count bubble for information that needs no action.

## Props
- `items`: `{ id, label, icon, href, count?, countTone?: 'danger' | 'warning' }[]` (at most 5), and `current` (the id of the current item). No item, label, route or count is built into the component.

## Built from
Icon, Badge (count). Items are links with the current one marked.
