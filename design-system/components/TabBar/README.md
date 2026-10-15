# TabBar

The phone bottom navigation: a floating pill. This is the only mobile navigation format. It draws the items the app gives it, in the order given; FinanceOS passes Home · Inbox · Upcoming · Transactions · More.

## Look
- A pill floating 12px in from the left, right and bottom edges (above the safe area): `bg-surface`, a `line` border, `radius-pill`, `shadow-dock`, padding 8px top and bottom and 4px at the sides.
- Each item is the icon (`lg`, 20px) over its label (`tab-label`), 2px apart, centred in an equal-width slot.
- Inactive items are `ink-faint`. The current item is `ink` with its label at weight 800. There is no background, indicator, dot or underline behind the current item.
- Counts are Badge `count` pinned to the icon's top-right corner, with a 2px `bg-surface` ring so they read cleanly over the icon: `danger` for things that need you now (Inbox), `warning` for the review count (Transactions). Over 99 shows "99+".
- Pressed: the item's label and icon go one step darker (`ink-3`) for the press; nothing moves.

## More
- Tapping More opens a popup sheet anchored just above the bar (not a full screen): the drag handle, the search field, Quick add (Transaction · Lending · Trade · Import), the remaining sections in their groups (Money · Grow · Owe & lend · Insights), and the profile row that leads to Settings. The bar stays visible with More current; the rest of the screen is under the `scrim`. Tapping the scrim, swiping the sheet down or tapping More again closes it.
- The sheet is the Dialog sheet form, drawn above the bar instead of from the screen edge; its contents come from the app's navigation config, like the bar's items.

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
- One format. Stories show Home current, Transactions current, counts over 99, and More open.
