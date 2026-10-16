# SearchField

A search box with a leading magnifier. Every search input carries the icon.

## Use
- In lists it is the first thing in the filter area. On phone it takes its own full-width row above the filter chips.
- Inside sheets it is a labelled field ("Find the other side") so it reads as an input, not a filter.
- Placeholder names what can be searched: "Search merchant keys or names…".

## Props
- `size?: 'md' | 'lg'`: height and padding (`'md'` default for filters, `'lg'` for sheet inputs).
- `variant?: 'default' | 'embedded'`: visual border/background style (`'default'` with border/bg-surface, `'embedded'` for use within Select dropdowns).
- `label?: React.ReactNode`: field label above the input.
- `helper?: React.ReactNode`: helpful hint or status text below the input.
- `error?: React.ReactNode`: error message below the input.
- `optional?: boolean`: shows "(Optional)" next to the label.
- `className?: string`: class applied to the outer FieldFrame wrapper.
- `controlClassName?: string`: class applied to the inner input container box.
- `onValueChange?: (value: string) => void`: change callback receiving the current string value.
- `onClear?: () => void`: callback when the clear button is pressed.
- `clearLabel?: string`: aria-label for the clear button (default "Clear search").
- Standard `<input>` HTML attributes (`value`, `defaultValue`, `placeholder`, `disabled`, etc.).

## Variants
- Sizes: `size="md"` (default), `size="lg"`.
- States: default (empty), with value (shows clear × button), labelled, with helper, disabled.
- Style: `variant="default"`, `variant="embedded"`.

## Built from
The shared field frame (`FieldFrame`), Icon (`search`, `x`).
