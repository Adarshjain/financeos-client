# TransactionPicker

One open transaction list (owner decision 13b): a search field, a Debit / Credit filter, rows with a Radio (or Checkbox) at the left and the amount at the right, and a Pager below the list. It replaces the dropdown picker in Mark paid, Settle up, Add lending and Edit entry, and is the transaction chooser in the Link dialogs. The page fetches and formats; the list never filters.

## Props
- `items`: `{ id, title, subtitle?, amount, isCredit?, disabled?, disabledReason? }[]`. Credit amounts show in `positive`.
- `multiple?: boolean` (default `false`): Radio rows with `value: string | null`, or Checkbox rows with `value: string[]`.
- `value` / `defaultValue` / `onValueChange`.
- `query` / `defaultQuery` / `onQueryChange`: the search text. Matches in title, subtitle and amount get the marker stroke.
- `searchPlaceholder?` (default "Search…").
- `loading?`: skeleton rows with no items; with items, they stay while the next page loads.
- `filter?` / `defaultFilter?` / `onFilterChange?`: `'all' | 'debit' | 'credit'` (default `all`), a compact (`sm`) SegmentedControl under the search. Drawn only when `onFilterChange` is given; the page fetches with it, and resets `page` to 0 when it changes (owner 2026-10-23).
- `page?` (0-based), `pageSize?`, `totalElements?`, `onPageChange?`: real server-side paging. A compact Pager sits below the list only (§5.5), page size 10, no rows-per-page control when `onPageChange` is given and `totalElements` is more than `pageSize`. Replaces Show more (owner 2026-10-23).
- `emptyLabel?`: shown when not loading and `items` is empty.
- `label?`: caption above the list, e.g. "Open entries with Rahul Sharma".
- `error?`: danger line under the list.

## Use
- Clicking a row toggles it (single: selects; a second click on the selected row does nothing). Disabled rows cannot be selected and show `disabledReason` after the subtitle.

## Built from
`TextField` (search), `ListRow`, `Radio`, `Checkbox`, `Highlight`, `SegmentedControl` (sm), `Pager` (compact), `Text`, `Skeleton`, `Icon`.

## Variants
Single, multiple, loading, empty, with Debit / Credit filter, paged (Pager), with error, disabled row.
