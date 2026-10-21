# DataTable

The list frame for every table of records: column headers with sort, a selection column, group bands, expandable rows, a footer line, and the Pager above and below. One component and one markup: a table on desktop, stacked rows on phone, chosen by CSS at `desk`.

**Status:** approved by the owner (2026-10-17), with the requirements review the same day. Not built.

## Use
- Every list of records the desktop boards draw as a table: transactions, account recent transactions, accounts, holdings, tradebook, F&O, dividends, instruments, corporate actions, lendings and ledgers, loans and schedules, statement lines, import lines, reports and report tables, "View underlying data", categories, reward lines, settings lists (AI keys, connections, jobs). Card grids (rules) and action lists (inbox, upcoming) are not tables: they use RuleCard and ListRow.
- **DataTable is the table only.** The page puts it in a Card, with `Card.Header` for the title strip (title, subtitle, links, selectors), or directly in a Dialog body for "View underlying data".
- **Desktop (`desk` and up):**
  - **Header row:** `overline` type in `ink-3` on `bg-sunken`, 32px tall. The checkbox column comes first when the table is selectable. Number columns (`align: 'end'`) are right-aligned with tabular figures.
  - **Rows:** at least 40px tall, cells padded `px-space-12 py-space-6`. A cell is one line with ellipsis unless its column has `wrap: true`; then it may hold several lines (a name with a muted subtitle, a description with its context line, two stacked values).
  - **Sorting:** a sortable header is clicked to sort by that column. Each click moves through ascending, descending and off. The active header shows a chevron for the direction. One column at a time.
  - **Sticky header** (`stickyHeader`, default on): the header sticks to the top of the table's scroll container (report widgets, dialogs). On a page, the table doesn't scroll on its own, so nothing sticks there.
- **Phone (below `desk`):** the header and the checkbox column aren't shown. Each row stacks into:
  - line 1: the `main` cell on the left, the `amount` cell on the right;
  - line 2: the row's `phoneSub` text on the left, the `status` cell on the right (it may hold several chips; they wrap, right-aligned). From `desk` up the `status` cell follows `meta.align` (default start), not the right pin;
  - an optional line 3: `phoneActions` buttons, right-aligned;
  - in selection mode, the eye button in a third column on the right, spanning the lines.

  `phoneSub` is one line the page composes from several desktop columns ("60 × ₹1,512.70 · P&L +₹48,162", "12 Oct · ₹2,95,030"). Columns marked `phone: 'hidden'` aren't shown on phone.
- **Column widths** come from tokens, never pixels. Column `size`: `xs` (the checkbox or an icon column, `control-md`), `sm` (`space-96`), `md` (1.5 × `space-96`), `lg` (2 × `space-96`), or `fill` (takes the remaining space; `grow` sets its share, default 1). DataTable turns them into one grid template on its root, and every row, the header and any row component use that same template, so cells always line up.
- **Bands and day headers:**
  - `band(row)` returns `{ key, label }`. A band row is inserted whenever the key changes, at every width, in SectionHeader `band` style. The page supplies the label, and an optional `action` drawn at the band's right end. For transactions it's the month name only (owner).
  - `dayHeader(row)` does the same for the phone's sticky day headers ("12 Oct · Mon", SectionHeader `strong`). They aren't shown on desktop.
- **Footer:** `footer` is a line under the last row and above the bottom Pager, for summaries and table actions ("Total net ₹3,605 · TDS ₹370 · Export CSV").
- **Pager:** DataTable renders the Pager it's given in two places: above the header, and as the last row. Paging is always **server-side** (RULES §5.5).
- **Sort mode:**
  - `sortMode: 'server'` (default): DataTable reports the sort and the page refetches. The page converts DataTable's sort into its endpoint's format (`"date,desc"`, `{ key, direction }`…).
  - `sortMode: 'client'` (owner, 2026-10-17): only for lists the server returns **whole** (one account's statements, a loan's schedule, a person's ledger, holdings). DataTable sorts the rows it has. Never combine it with a Pager, and never slice rows on the client.
- **Selection** (RULES §7.4):
  - **Desktop:** the checkbox column. The header checkbox selects every row on the page; it shows the mixed state when only some are selected. A row's checkbox never triggers the row click.
  - **Phone:** long-press starts selection (touch or mouse, while still held), then tap toggles. The eye opens the row's detail without leaving selection. Selection mode is on whenever at least one row is selected.
  - Selection is a set of row ids. It survives paging; the page clears it when filters change.
  - **Select all across pages:** when the page passes `allSelected`, every row shows as selected. Unticking one row turns it off and reports the page's other ids as the selection. SelectionBar's "Select all 182" sets it.
  - A selected row uses TransactionRow's selected look (`brand-tint` with the 4px `brand` stripe on the left). A highlighted row uses ListRow's highlighted look (`brand-strong` stripe). The page shows SelectionBar from the selection.
- **Row click** opens the record's detail when the page passes `onRowSelect`. Without it, rows aren't clickable. In selection mode a tap toggles selection instead.
- **Expandable rows:** with `renderExpanded(row)`, a leading chevron column opens a detail block under the row, at full width. For example, a breakdown's sub-rows, a loan year's EMIs or a job's result.
- **Row states:** `rowState(row)` returns `{ tone?: 'warning', disabled?: boolean, muted?: boolean, pressable?: boolean }`. `warning` gives the same look as TransactionRow's warning tone: the `attention-tint` ground (a transaction being watched); `disabled` dims the row and stops clicks (an excluded transaction); `muted` dims the row like `disabled` but keeps it clickable (a closed account); `pressable: false` makes one row skip `onRowSelect` (no button role, no hover) while it looks normal and its inner buttons work. `highlightedRowId` shows ListRow's highlighted look on that row and scrolls it into view once (a row opened from a notification).
- **Swipe** (phone): `wrapRow(row, node)` lets the page wrap each row, for example in SwipeActions (RULES §7.5). DataTable never swipes itself.
- **Row component:** `renderRow(row, rowProps)` lets an organism draw the whole row at every width. It must use the shared grid template on desktop and its own phone layout. **Transactions use TransactionRow.** It keeps all its logic and gains a desktop layout. Its column headers are exported next to it as `transactionColumns`.
- **States:**
  - **Loading** (no rows yet): Skeleton rows in the same columns, as many as the page size (5 when there is no Pager).
  - **Busy** (`busy`, a new page or sort is loading while the old rows stay): the rows dim, and the table is `aria-busy`.
  - **Empty:** the page's `empty` node (an EmptyState) in place of the rows. The header stays.
  - **Error:** the page shows a Banner above the table and keeps the last rows it had.

## Props
- `columns`: TanStack v9 column definitions built with DataTable's column helper. Each column has:
  - `id` and `header`;
  - `cell` or an accessor;
  - `meta: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'fill', grow?: number, align?: 'start' | 'end', wrap?: boolean, phone?: 'main' | 'amount' | 'status' | 'hidden', sortable?: boolean }`.
- `data`, and `getRowId(row)` (required; a stable id).
- `sort?: { id: string; desc: boolean } | null`, `defaultSort`, `onSortChange`: through `useControllableState`.
- `sortMode?: 'server' | 'client'` (default `'server'`).
- `selectable?: boolean`, `selection?: string[]`, `defaultSelection`, `onSelectionChange`: through `useControllableState`.
- `allSelected?: boolean`, `onAllSelectedChange?`.
- `onRowSelect?: (row) => void`.
- `renderExpanded?: (row) => ReactNode`, `getRowCanExpand?: (row) => boolean`, `expanded?: string[]`, `defaultExpanded`, `onExpandedChange`.
- `leading?: (row) => ReactNode`: a mark (bank logo) at the start of the `main` cell on desktop; on phone it sits left of the `main` and `phoneSub` lines, so the sub-line starts under the name. `null` draws nothing.
- `phoneSub?: (row) => ReactNode`, `phoneActions?: (row) => ReactNode`.
- `band?: (row) => { key: string; label: ReactNode; action?: ReactNode } | null`, `dayHeader?: (row) => { key: string; label: ReactNode; sublabel?: ReactNode } | null`.
- `rowState?: (row) => { tone?: 'warning'; disabled?: boolean; muted?: boolean; pressable?: boolean }` (`pressable` defaults to true), `highlightedRowId?: string`.
- `wrapRow?: (row, node: ReactNode) => ReactNode`.
- `renderRow?: (row, rowProps) => ReactNode`. `rowProps` carries `selectable`, `selected`, `onSelectedChange`, `selectionMode`, `onSelect`, `highlighted`, `expanded` and `onExpandedChange`.
- `pager?: ReactNode`, `footer?: ReactNode`.
- `loading?: boolean`, `busy?: boolean`, `empty?: ReactNode`, `skeletonRows?: number`.
- `stickyHeader?: boolean` (default `true`).
- Native props, `ref` and `className` (layout only) on the root.

## Built from
TanStack Table v9 (`@tanstack/react-table`, pinned 9.2.4; state only: sorting, selection, expansion and columns; owner-approved 2026-10-17), Checkbox, Button (sort headers, expander, eye), Icon, Pager (passed in), SectionHeader (bands, day headers), Skeleton, `useSelectableItem` (press and long-press, on React Aria), `useControllableState`.

## Variants
- Plain.
- Selectable (checkbox column on desktop, long-press on phone), including select-all across pages.
- Sorted (server and client mode).
- With bands and phone day headers.
- Band with an action.
- Multi-line cells, number columns and status chips.
- Phone second line and phone actions.
- Expandable rows.
- Row states: warning, disabled, muted, highlighted.
- With footer.
- Row component (TransactionRow).
- Loading, Busy, Empty.
- In a dialog body (no Card, scrolls inside, sticky header).

## Don't
- No client-side paging or slicing of a full list (RULES §5.5).
- No column picker, saved views, resizable or reorderable columns (RULES §9).
- No horizontal scroll on phone: phone always stacks.
- No viewport detection in JavaScript: phone versus desktop is CSS only (RULES §5c.3).
- No pixel widths: column sizes come from tokens.
- No row actions drawn by DataTable: an actions column holds the page's Menu or Buttons.
- Not in v1: pivot tables with multi-level headers, drag-to-reorder rows, several tables sharing one Pager. They stay with their pages until those pages migrate.
