# FilterChip

Filter chips sit in one scrolling row under the search. They filter the list in place and combine with AND.

## Variants
- Default: outlined, `ink-2` text, optional ▾ when it opens a picker.
- On: `brand-tint` with `brand-border` and `brand-strong` text.
- Review: the "Needs review · 25" chip turns amber (`chip-amber`) when on, since it shows what needs you.
- A chip that opens a picker shows its value when set: "Account · 2".

## Use
- Status chips first (Unverified · Verified · All), then Category, then the rest.
- The row never wraps; on phone it scrolls and bleeds to the edges.
- Toggles that the user did not set stay off by default ("Up to statement").

## Variants
- Off, on, on with a value, with a count, removable, review (amber when on), plain toggle, and the dashed "+ More" that opens the full filter sheet.
