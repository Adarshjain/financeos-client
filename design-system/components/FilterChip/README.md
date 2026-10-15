# FilterChip

A chip in the filter row under the search. Chips filter the list in place and combine with AND. FilterChip only draws the chip; a chip that opens choices is the `trigger` of a Select, so the list, search, multi-select and phone sheet are the Select's.

## Looks
- Off: outlined, `ink-2` text. On: `brand-tint`, `brand-border`, `brand-strong` text. Review: amber when on ("Needs review · 25").
- A dropdown chip shows a ChevronDown and, once set, its value: "Account · 2".
- Removable chips end in an X. The chevron and the X are both `icon-sm` (14px), in the same colour as the label.
- With a count: a CountBubble after the label.
- "+ More": dashed, opens the full filter Dialog.

## Use
- Status chips first (Unverified · Verified · All), then Category, then the rest. The row never wraps; on phone it scrolls and bleeds to the edges.
- Toggles the user did not set stay off ("Up to statement").

## Built from
Icon, Badge (count). Dropdown chips: Select with `trigger={<FilterChip …/>}`.

## Variants
- Off, on, on with a value, dropdown, with a count, removable, review (amber), toggle, "+ More".
