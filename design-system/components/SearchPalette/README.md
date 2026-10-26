# SearchPalette

The ⌘K search over everything: accounts, actions, transactions, pages and Ask (`D-search`, `P-search`). Opened from the Rail's Search field, the phone TopBar's search button, or ⌘K / Ctrl+K.

## Use
- A Dialog, size `md`, with no header (`srTitle` "Search"). On desktop it sits `space-40` from the top; on phone it is the bottom sheet (§5.6).
- Top row: the search TextField (`type="search"`, search Icon prefix). Desktop shows an `esc` Kbd in the field; phone shows a ghost **Cancel** button instead.
- Results come from the page, grouped, in the page's order. The palette never filters or sorts. Groups with no rows are not shown. Each group starts with a SectionHeader (band) with the group's label and optional `meta` ("8 on Regalia").
- Each row is a ListRow: a fixed-width leading column when the row has a mark (an Icon; rows without one start at the edge, owner 2026-10-26), the row text in `body` (`ink`; the page bolds a name with `Text body-strong`), and an optional trailing node (count, amount, Kbd shortcut). A string title marks every match of the search text with Highlight (owner, 2026-10-26).
- The first enabled row is highlighted when the results change. ↑ and ↓ move the highlight (wrapping), skipping disabled rows; the highlighted row has ListRow's highlighted look. Enter or a click opens it: the row's `onSelect` runs and the palette closes. Esc, the backdrop, swipe-down (phone) and Cancel close it.
- `loading`: four Skeleton lines replace the results.
- Search text with no results: `No results for "zomato"` in `ink-3`, centred. Empty search text with no results: nothing.
- Desktop footer: hints "↑↓ move" (chevron Icons in a Kbd) and "Enter open". Hidden on phone.

## Props
- `open`, `defaultOpen`, `onOpenChange`.
- `value`, `defaultValue`, `onValueChange`: the search text.
- `groups: { id, label, meta?, items: { id, title, leading?, trailing?, disabled?, onSelect }[] }[]`.
- `loading?: boolean`.
- `hint?: ReactNode`: a muted `caption` line (ink-3) above the results, shown whatever the results are (the app uses it to nudge a too-short search). The words come from the app.
- `shortcutKey?: string`: ⌘ / Ctrl + this key toggles the palette anywhere on the page (the app passes `"k"`).
- Overridable words: `placeholder` ("Search…"), `emptyLabel` (`(query) => …`), `cancelLabel` ("Cancel"), `moveLabel` ("move"), `openLabel` ("open"), `srTitle` ("Search").

## Variants
None.

## Built from
Dialog (DialogContent, DialogBody, DialogFooter), TextField, Button, Kbd, Icon, Highlight, SectionHeader, ListRow, Skeleton, Text. The highlight and ↑/↓/Enter are the palette's own (about 20 lines; no cmdk needed).
