# Card

The container for a group of related rows: a header with title, subtitle and an optional link or small action, then rows separated by `line-soft`.

## Props
- `title?: ReactNode`
- `subtitle?: ReactNode`
- `action?: ReactNode` (node slot for link or small action)
- `asChild?: boolean` (delegates rendering to child element via Radix Slot, e.g. `<Card asChild><a href="…">…</a></Card>`)
- Compound parts: `Card.Header`, `Card.Title` (`as?: ElementType`, `truncate?: boolean`), `Card.Subtitle` (`as?: ElementType`, `truncate?: boolean`), `Card.Row`, `Card.Section`, `Card.Empty`, `Card.Footer` (uses consistent `px-space-16` horizontal padding).

## Use
- Header: `heading` title (14px, 800), `label` subtitle in `ink-3`, link or action at the right ("Inbox ›").
- Cards have a `line` border and `radius-lg`, no shadow.
- Cards sit on `bg-canvas`; never nest a card in a card (use a section band or note instead).
- The list's Pager, when it has one, is the card's last row.

## Built from
Text, SectionHeader, Slot, Pager, Button, Icon.

## Variants
- Title with subtitle and link, with an action, with rows, with a pager footer, with section bands, empty, asChild.
