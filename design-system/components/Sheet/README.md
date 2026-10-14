# Sheet

On phone every dialog is a bottom sheet: rounded top corners (`radius-sheet`), a drag handle, title and subtitle, scrolling body, sticky footer.

## Rules
- No × button on phone: swipe down or tap the scrim to close. Desktop dialogs keep ×.
- The body is the only scroller; the footer stays pinned with full-width buttons (`btn-xl`), primary on the right.
- Detail sheets list facts as `fld` rows and put actions in one row near the top (Edit · Link to… · ✓ Review · Delete).
- Open dropdowns inside a sheet open as a second sheet over it.

## Variants
- Form, detail (actions row + label/value rows), picker (a long Select on phone), result summary (counts, then the rows that were skipped or failed). Confirmations use ConfirmSheet.
