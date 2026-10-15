# Rail

The desktop left navigation, 240px (`rail`). Phone uses TabBar and More instead.

## Anatomy
Brand row (₹ mark + FinanceOS), the search button with its ⌘K hint, Home · Inbox · Upcoming, then grouped sections with `overline` headers (Money · Grow · Owe & lend · Insights), and Settings with the account avatar pinned at the bottom.

## Use
- The current page is `brand-tint` with `brand-strong` text and icon.
- Counts: Inbox uses a danger CountBubble (needs you now); Transactions shows the review count as a `warning` number, no bubble.
- Items are links (`href`), icons `lg`, labels `body-strong`.

## Props
`items` (grouped: label, href, icon, count, countTone), `current`, `user` (name, email, avatar) — never hard-coded.

## Built from
Icon, Badge (count), Avatar, Kbd, Button (search).

## Variants
- Default, with counts, collapsed group headers hidden when a group has one item.
