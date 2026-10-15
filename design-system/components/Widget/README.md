# Widget

A dashboard tile: title, subtitle and a ⋮ menu, then a figure, rows, a chart or a table. Widgets size to their content.

## States
- Loading: a skeleton in the widget's own shape (a figure or rows).
- Failed: an inline error with Retry; the rest of the dashboard still renders.
- Unavailable: the report behind it was deleted; offer Remove.
- Report tables sort by header and page inside the widget.

## ⋮ menu
Report widgets: Edit report · View full page · View underlying data (KPIs). Built-ins and templates: Widget settings · Duplicate as my report (templates) · View full page.

## Props
- Messages for its states (couldn't load, report no longer available) and its menu items come from the page.

## Built from
Card, Menu, Skeleton, Button (Retry).
