# Tile

A bordered, tappable tile that pairs a navigation icon with a short label. Used by the More sheet for its section links and its Quick add actions.

## Variants
- `row`: icon on the left, label beside it, 46px tall (section links: Accounts, Transactions, Investments…).
- `stacked`: icon above the label, centred (Quick add: Transaction, Lending, Trade, Import).

## Look
`bg-surface`, a `line` border, `radius-lg`; icon `lg` (20px) in `ink-3`; label `body-strong` in `ink` (row) or `label` in `ink-2` (stacked). Hover `bg-hover`, pressed `bg-pressed`. No badge, chevron or description.

## Props
`icon` (registry name), `label`, `href` or `onSelect`, `variant`. Renders a link when given `href` (`asChild` with Next Link).

## Built from
Icon.

## Variants list
- Row, stacked.