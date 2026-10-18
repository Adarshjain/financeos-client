# TabBar

The phone bottom navigation: a floating pill. This is the only mobile navigation format. It draws the items the app gives it, in the order given; FinanceOS passes Home · Inbox · Upcoming · Transactions · More.

## Look
- A pill floating 12px in from the left, right and bottom edges (above the safe area): `bg-surface`, a `line` border, `radius-pill`, `shadow-dock`, padding 8px top and bottom and 4px at the sides.
- Each item is the icon (`lg`, 20px) over its label (`tab-label`), 2px apart, centred in an equal-width slot.
- Inactive items are `ink-faint`. The current item is `ink` with its label at weight 800. There is no background, indicator, dot or underline behind the current item.
- Counts are Badge `variant="solid" shape="rounded" size="sm"` pinned to the icon's top-right corner, with a 2px `bg-surface` ring so they read cleanly over the icon: `danger` for things that need you now (Inbox), `warning` for the review count (Transactions). Over 99 shows "99+".
- Pressed: the item's label and icon go one step darker (`ink-3`) for the press; nothing moves.

## More
Tapping More opens the **More sheet** (final, owner 2026-10-16; board `P-more`): a bottom sheet over the page, built from Dialog's sheet form.
- **Quick add**: four Buttons `variant="tile" iconPosition="top"`: Transaction, Lending, Trade, Import. This is the one exception to "the + is the only add button" (RULES §7.1).
- **Sections**, in groups with `overline` labels: Money (Accounts, Transactions) · Grow (Investments, Rewards) · Owe & lend · Insights (Loans & lendings, Dashboards, Reports, Ask the data). Each is a Button `variant="tile"` (icon start), two per line, with the same navigation icon as the Rail.
- **Profile row** at the bottom: Avatar, the user's name (their email when there is no name), "Settings · connections · notifications", chevron. It links to Settings, with no underline.
- No search field: search lives in the page and the TopBar.
- Every item comes from the app's navigation config; nothing is built into the component.
- **Layers, bottom to top:** page content, TabBar, scrim, sheet. The sheet is Dialog's sheet form, modal, as drawn on `P-more`: it rises from the bottom edge and covers the TabBar, so More is not visible while it is open. It closes on a scrim tap above the sheet, on swipe down, or by choosing an item. The TabBar is never raised above the scrim or the sheet.
- The sheet uses Dialog `background="canvas"`; group labels are Text `overline` in `ink-4`; the profile row is a ListRow `asChild` inside a Card.

## Use
- Shown on every top-level phone screen, below `desk` only. It is hidden while a list is in selection mode (the selection bar takes the bottom edge) and under the keyboard.
- Page content scrolls under the pill; the page keeps bottom padding equal to the pill's height plus 24px, so the last row can scroll clear of it.

## Props
- `items`: `{ id, label, icon, count?, countTone?: 'danger' | 'warning', asChild?: boolean, children?: ReactNode }[]` (at most 5), and `current` (the id of the current item). No item, label, route or count is built into the component.

## Don't
- Don't add a sixth item; new sections go under More.
- Don't use a count for information that needs no action.
- No other mobile navigation format exists; don't add variants.

## Built from
Icon, Badge (`variant="solid" shape="rounded" size="sm"`), Slot (for `asChild` links). Items are buttons or `asChild` links with the current one marked.

## Variants
- One format. Stories show Default (Home current), counts over 99, and with asChild link.
