# FilterChip

A chip in the filter row under the search. Chips filter the list in place and combine with AND. FilterChip only draws the chip; a chip that opens choices is the `trigger` of a Select, so the list, search, multi-select and phone sheet are the Select's.

## Looks
- Off: outlined (`variant="outline"`), `ink-2` text. On: soft (`variant="soft"`), `brand-tint`, `brand-border`, `brand-strong` text. Review: warning tone when on ("Needs review · 25").
- A dropdown chip shows a ChevronDown and, once set, its value: "Account · 2".
- Removable chips end in an X. The chevron and the X are both `icon-sm` (14px), in the same colour as the label.
- With a count: a count Badge after the label.
- "+ More": dashed (`variant="dashed"`), opens the full filter Dialog.

## Use
- Status chips first (Unverified · Verified · All), then Category, then the rest. The row never wraps; on phone it scrolls and bleeds to the edges using standard layout classes.
- Toggles the user did not set stay off ("Up to statement").

## Built from
Icon, Badge (count). Dropdown chips: Select with `trigger={<FilterChip …/>}`.

## Props
`selected`, `defaultSelected`, `onSelectedChange`, `variant` ('outline' | 'soft' | 'dashed'), `tone` ('brand' | 'warning' | 'neutral'), `hasDropdown`, `count`, `removable`, `onRemove`, `disabled`. When removable, `className` and `ref` go on the outer wrapper element and button props go on the main chip button.

## Variants
- Outline (off), soft (selected/on), dashed ("+ More"), warning tone (review), dropdown, with count, removable, disabled.
