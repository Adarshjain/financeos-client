# Widget

A dashboard tile: title, subtitle and a ⋮ menu, then a figure, rows, a chart or a table. Widgets size to their content.

## States
- Loading: a skeleton in the widget's own shape (a figure or rows).
- Failed: an inline error with Retry action; the rest of the dashboard still renders.
- Unavailable: shown when the content can't be shown (e.g. report deleted); offers Remove action.
- Report tables sort by header and page inside the widget.

## ⋮ menu
Report widgets: Edit report · View full page · View underlying data (KPIs). Built-ins and templates: Widget settings · Duplicate as my report (templates) · View full page.

## Props
`title`, `subtitle`, `menu`, `menuItems`, `loading`, `loadingSkeleton`, `error` (message node), `errorTitle`, `unavailable` (message node), `unavailableTitle`, `action` (`{ label, onSelect }`).

## Built from
Card, Menu, Skeleton, Button.

## Variants
- Figure, rows loading, failed (error with action), unavailable (with action), with menu.
