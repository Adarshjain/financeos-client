# ResponsiveOverlay

The one place the system switches between two different interaction primitives by screen size: a floating Popover from `lg` up, a bottom-sheet Dialog below it. Select, Menu and DateField open through it, so none of them detects the viewport themselves.

## Rules
- It renders only while open, so the server never has to guess the width and nothing jumps.
- The content (option list, menu items, calendar) is written once and passed in; the overlay only decides the container.
- On phone the sheet takes a title (the field label) and the content's own footer (Clear, Done · n).

## Props
`open`, `defaultOpen`, `onOpenChange`, `trigger`, `title` (sheet title on phone), children.

## Built from
Popover, Dialog, the one viewport hook in the system.

## Variants
- Desktop popover, phone sheet.
