# TabBar

The phone bottom navigation: a floating pill. This is the only mobile navigation format. It draws the items the app gives it, in the order given; FinanceOS passes Home · Inbox · Upcoming · Transactions · More.

## Look
- A pill floating 12px in from the left, right and bottom edges (above the safe area): `bg-surface`, a `line` border, `radius-pill`, `shadow-dock`, padding 8px top and bottom and 4px at the sides.
- Each item is the icon (`lg`, 20px) over its label (`tab-label`), 2px apart, centred in an equal-width slot.
- Inactive items are `ink-faint`. The current item is `ink` with its label at weight 800. There is no background, indicator, dot or underline behind the current item.
- Counts are Badge `count` pinned to the icon's top-right corner, with a 2px `bg-surface` ring so they read cleanly over the icon: `danger` for things that need you now (Inbox), `warning` for the review count (Transactions). Over 99 shows "99+".
- Pressed: the item's label and icon go one step darker (`ink-3`) for the press; nothing moves.

## More
- What More opens is **on hold** (owner, 2026-10-16): to be discussed separately. Until then More links to the More screen. The "More open" drawing on the board is a parked proposal, not to be built.

## Use
- Shown on every top-level phone screen, below `lg` only. It is hidden while a list is in selection mode (the selection bar takes the bottom edge) and under the keyboard.
- Page content scrolls under the pill; the page keeps bottom padding equal to the pill's height plus 24px, so the last row can scroll clear of it.

## Props
- `items`: `{ id, label, icon, href, count?, countTone?: 'danger' | 'warning' }[]` (at most 5), and `current` (the id of the current item). No item, label, route or count is built into the component.

## Don't
- Don't add a sixth item; new sections go under More.
- Don't use a count for information that needs no action.
- No other mobile navigation format exists; don't add variants.

## Built from
Icon, Badge (count). Items are links with the current one marked.

## Variants
- One format. Stories show Home current, Transactions current, and counts over 99.
