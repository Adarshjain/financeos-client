# Card

The container for a group of related rows: a header with title, subtitle and an optional link or small action, then rows separated by `line-soft`.

## Use
- Header: `ct` title (14px, 800), `cs` subtitle in `ink-3`, link at the right ("Inbox ›").
- Cards have a `line` border and `radius-lg`, no shadow.
- Cards sit on `bg-canvas`; never nest a card in a card (use a section band or note instead).
- The list's Pager, when it has one, is the card's last row.

## Built from
SectionHeader, Pager, Button, Icon.

## Variants
- Title with subtitle and link, with an action, with rows, with a pager footer, with section bands, empty.
