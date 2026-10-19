# Pager

Pagination for any list that can outgrow one page, matching the app's TablePagination: the visible range out of the total, rows per page, and numbered pages with first, last and neighbours.

## Use
- It sits **above and below the list**: the first row of the list's card (under the card header, above the table header) and its last row. Card-grid lists (rule cards) put it above and under the grid. Both copies always show the same page.
- Desktop: "1–50 / 182 transactions" · "50 / page ▾" · ‹ 1 2 … 4 › (or custom `summary`).
- Phone: drop the unit and the page-size select, keep one neighbour fewer: "1–50 / 182" · ‹ 1 … 4 ›.
- A single page shows the count and page size only, no arrows.
- A gap of exactly one page shows that page, never an ellipsis (page 1 of 3 reads ‹ 1 2 3 ›, not ‹ 1 … 3 ›). Phone and desktop each get their own ellipses.
- Server-side paging only. Never load every row and slice on the client.

## Variants
- `default`: `control-md` controls, `space-10` vertical padding.
- `compact` is the default (owner 2026-10-19): `control-sm` controls, `space-4` vertical padding, `label` text, for lists where the pager sits above and below a dense table.

## Consumer provides
`page` (0-based), `size`, `totalElements`, `totalPages?`, `unit?`, `summary?`, `sizeLabel?`, `onPageChange`, `onSizeChange?`, `sizeOptions?`, `borderPosition?`, `variant?` (`compact` | `default`; defaults to `compact`).

## Don't
- Don't use "Load more" or infinite scroll for money lists; people need to say "page 3" and come back to it.
- Don't show two pagers on one list.

## Built from
Button, Icon, Select (rows per page).
