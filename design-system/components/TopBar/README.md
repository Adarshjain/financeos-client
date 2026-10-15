# TopBar

The desktop bar above every page, 56px (`app-bar`), `bg-surface` with a `line` bottom border.

## Anatomy
Page title (or breadcrumb + title on detail pages) on the left; on the right the Add button with its ⌘N hint (opens the add form for the page, like the phone +), the chat panel and notifications icon buttons.

## Props
`title`, `crumb`, `onAdd` (or the add target), `actions` limited to chat and notifications.

## Built from
Button, Icon, Kbd.

## Variants
- Top level, detail (with crumb).
