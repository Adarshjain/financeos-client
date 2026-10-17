# DataTable

The list frame for every table of records: column headers with sort, a selection column, sticky header, group bands, and the Pager above and below. One component and one markup: a table on desktop, stacked rows on phone, chosen by CSS at `lg`.

**Status:** approved by the owner (2026-10-17). Not built.

## Use
- Every list of records that the desktop boards draw as a table (54 boards): transactions, accounts, holdings, dividends, F&O, rules list, statements, report "View underlying data", and the rest.
- **Desktop (`lg` and up):** a table inside a Card.
  - **Header row:** `overline` type in `ink-3` on `bg-sunken`, 32px tall. The checkbox column comes first when the table is selectable. Number columns are right-aligned.
  - **Sorting (desktop):** a sortable header is clicked to sort by that column. Clicking again reverses the direction. The active header shows a chevron for the direction. The page refetches.
  - **Sorting (phone):** there are no headers, so the page offers sort through its filters (the "Sort: … ▾" chip or the Sort section of the filters dialog), using the same `sorting` state.
  - **Rows:** at least 40px tall, cells padded `px-space-12 py-space-6`, one line each, with ellipsis. Numbers use tabular figures.
  - **Sticky header** when the table scrolls inside its container (report widgets). On a page, the header sticks under the TopBar.
- **Phone (below `lg`):** the same rows stack into two lines:
  - top line: the `main` cell on the left, the `amount` cell on the right;
  - bottom line: the `sub` cell on the left, the `status` cell on the right;
  - `hidden` cells, the header row and the checkbox column aren't shown;
  - rows group under sticky **day headers** ("12 Oct · Mon") when the table is grouped by date (RULES §7.6).
- **Bands:** an optional band row between month groups, with the **month name only** ("October 2026"), in SectionHeader `band` style. No counts or totals (RULES §9; owner 2026-10-17). The page supplies the text.
- **Pager:** the first row of the card (above the header) and its last row (RULES §5.5). DataTable renders the Pager it's given in both places. Paging and sorting are **server-side** only: DataTable never sorts or slices rows itself.
- **Selection** (RULES §7.4):
  - Desktop: the checkbox column. The header checkbox selects every row on the page and shows the mixed state when only some are selected.
  - Phone: long-press starts selection, tap toggles, and the eye opens the detail without leaving selection.
  - A selected row uses ListRow's selected look (`brand-tint` with the 4px `brand` stripe on the left).
  - The page shows SelectionBar from the selection DataTable reports.
- **Row click** opens the record's detail when the page passes `onRowSelect`. Without it, rows aren't clickable.
- **Swipe** (phone): the page wraps rows with SwipeActions through `renderRow`. DataTable doesn't swipe itself (RULES §5c.9).
- **States:**
  - Loading: Skeleton rows in the same columns (desktop) or the same two lines (phone), as many as the page size.
  - Empty: the page's EmptyState in place of the rows. The header stays when filters are active.
  - Error: the page's Banner above the table.

## Rows: built-in or a row component
- **Built-in row:** built from `columns`. Each column says where its cell goes on phone, through `phone: 'main' | 'sub' | 'amount' | 'status' | 'hidden'`. This is for most tables: accounts, holdings, dividends…
- **Row component** (`renderRow`): an organism draws the row at every width. It must lay its cells out in DataTable's columns on desktop (DataTable shares the column widths through context) and use its own phone layout below `lg`.
  - **Transactions use TransactionRow.** It keeps all its logic (long-press, eye, category actions, links, tone, credit colour) and gains a desktop layout: the cells date, description, category, account, amount and balance (per D-transactions), plus an actions cell.
  - Selection still comes from DataTable: TransactionRow gets `selected` and `onSelectedChange`.

## Props
- `columns`: column definitions (TanStack `ColumnDef`). Each column has:
  - `id` and `header`;
  - `cell` (render) or `accessor`;
  - `meta: { align?: 'start' | 'end', width?: string, phone?: 'main' | 'sub' | 'amount' | 'status' | 'hidden', sortable?: boolean }`.
- `data`: the rows of the current page. `getRowId(row)` gives a stable id, used for selection.
- `sorting`, `onSortingChange`: controlled sort state (TanStack `SortingState`). The page refetches from the server.
- `selectable?: boolean`, `selection`, `defaultSelection`, `onSelectionChange`: row ids, through `useControllableState`.
- `onRowSelect?: (row) => void`: row click (detail).
- `renderRow?: (row, rowProps) => ReactNode`: the row-component mode. `rowProps` carries `selected`, `onSelectedChange`, `selectionMode` and the column layout.
- `groupBy?: (row) => { key: string, label: ReactNode, sublabel?: ReactNode }`: day headers on phone.
- `bands?`: the group band rows, with page-supplied text.
- `pager?: ReactNode`: the Pager, rendered above and below.
- `loading?: boolean`, `empty?: ReactNode`.
- `stickyHeader?: boolean` (default `true`).
- Native props, `ref` and `className` (layout only) on the root.

## Built from
TanStack Table v9 (state only: sorting, selection, columns; owner-approved 2026-10-17), Card, Checkbox, Pager, SectionHeader, Skeleton, Icon (sort chevrons, eye), Text, `useSelectableItem` and `useLongPress` (phone selection), `useControllableState`.

## Variants
- Plain (no selection).
- Selectable (checkbox column on desktop, long-press on phone).
- Sorted (active header chevron, ascending or descending).
- Grouped by day (phone headers) with bands.
- Row component (TransactionRow).
- Loading, Empty.
- Inside a Widget (scrolls inside, sticky header).

## Don't
- No client-side sorting, filtering or paging of a full list (RULES §5.5).
- No column picker, saved views or resizable columns (RULES §9).
- No horizontal scroll on phone: phone always stacks.
- No viewport detection in JavaScript: phone versus desktop is CSS only (RULES §5c.3).
- No row actions drawn by DataTable: an actions cell holds the page's Menu.
