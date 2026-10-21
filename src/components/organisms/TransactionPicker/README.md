# TransactionPicker

One open transaction list (owner decision 13b): a search field, rows with a Radio (or Checkbox) at the left and the amount at the right, and Show more. It replaces the dropdown picker in Mark paid, Settle up, Add lending and Edit entry, and is the transaction chooser in the Link dialogs. The page fetches and formats; the list never filters.

## Props
- `items`: `{ id, title, subtitle?, amount, isCredit?, disabled?, disabledReason? }[]`. Credit amounts show in `positive`.
- `multiple?: boolean` (default `false`): Radio rows with `value: string | null`, or Checkbox rows with `value: string[]`.
- `value` / `defaultValue` / `onValueChange`.
- `query` / `defaultQuery` / `onQueryChange`: the search text. Matches in title, subtitle and amount get the marker stroke.
- `searchPlaceholder?` (default "Search…").
- `loading?`: skeleton rows with no items; with items, they stay and Show more shows busy.
- `hasMore?`, `onLoadMore?`, `loadMoreLabel?` (default "Show more").
- `emptyLabel?`: shown when not loading and `items` is empty.
- `label?`: caption above the list, e.g. "Open entries with Rahul Sharma".
- `error?`: danger line under the list.

## Use
- Clicking a row toggles it (single: selects; a second click on the selected row does nothing). Disabled rows cannot be selected and show `disabledReason` after the subtitle.

## Built from
`TextField` (search), `ListRow`, `Radio`, `Checkbox`, `Highlight`, `Button` (link), `Text`, `Skeleton`, `Icon`.

## Variants
Single, multiple, loading, empty, with Show more, with error, disabled row.
