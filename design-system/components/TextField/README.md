# TextField

A labelled single-line input. Label above in `ink-2` 12px bold; helper or error below.

## Use
Standard text input for forms, logins, and values.

## Props
- `size?: 'md' | 'lg' | 'xl'`: `md` and `lg` are `control-md` (32px) and differ in padding only (default `'lg'` 12px side padding, `'md'` 10px). `xl` is `control-xl` high with the input text in the `figure` type style and `lg` padding.
- `shape?: 'default' | 'pill'`: default `'default'`. `pill` matches a FilterChip: 28px high (`space-28`), 10px side padding, `ds-pill` radius, 6px gap, `label` text. FilterBar uses it for its search; use it for any search field placed beside filter chips.
- `align?: 'left' | 'right'`: input text alignment, default `'left'`. `right` end-aligns the text; prefix stays at the start, suffix and clear at the end.
- `variant?: 'default' | 'embedded'`: visual variant (`embedded` removes focus ring for use inside list overlays like Select).
- `tone?: 'neutral' | 'success'`: default `'neutral'`. `success` colours the input's value text with `positive`, the money-in green.
- `label?: React.ReactNode`: field label above the input. Plain text, not a `<label>`: tapping it does not focus the input; the input points at it with `aria-labelledby` (TextArea, DateField and Select the same). Disabled replaces hover, focus and error styling.
- `helper?: React.ReactNode`: helpful hint text below the input.
- `error?: React.ReactNode`: error message below the input.
- `optional?: boolean`: shows "(Optional)" next to the label.
- `clearable?: boolean`: shows a ghost `sm` **Clear** text button at the end when text is present (owner, 2026-10-26; was a × icon). Buttons in the field (Clear, a suffix button such as DateField's calendar) pull out by their own padding, so their label or glyph sits on the field padding.
- `clearLabel?: string`: the clear button's text (default `'Clear'`).
- `onClear?: () => void`: callback when cleared.
- `prefix?: React.ReactNode`: leading glyph, icon, or currency sign (e.g. "₹" or search icon).
- `suffix?: React.ReactNode`: trailing content.
- `className?: string`: class applied to the FieldFrame wrapper.
- `controlClassName?: string`: custom class applied to the `<input>` element.
- `onValueChange?: (value: string) => void`: callback with input value on change.
- Standard `<input>` HTML attributes (`type`, `inputMode`, `placeholder`, `disabled`, `value`, `defaultValue`, etc.).

## Search
The search form:
```tsx
<TextField type="search" size="md" prefix={<Icon name="search" size="sm" />} clearable clearLabel="Clear search" placeholder="Search…" />
```
When `type="search"`, browser search cancel buttons are hidden, and `clearable` renders a Dinero clear button that resets value and restores focus.

## Variants
- States: default, filled, placeholder (`ink-4`), focus (2px `focus-ring` only: the border keeps its 1px width and colour; the same on TextArea, DateField and the Select trigger), error (`danger` border and message), disabled.
- Password input (`type="password"`) includes an integrated Show/Hide toggle button.
- Numeric inputs (`inputMode="decimal" | "numeric"` or `type="number"`) format with `tabular-nums`.
- Search input (`type="search"`) with search prefix and clear button.
- Size xl (`size="xl"`): taller field with `figure` text, for a primary figure. Usage: Add/Edit transaction amount: `size="xl" align="right"`.
- Right aligned (`align="right"`): works with every size and with the embedded variant.
- Embedded variant (`variant="embedded"`) inside dropdowns.
- Success tone (`tone="success"`): value text in `positive`, for an amount that is money in.

## Built from
The shared field frame (`FieldFrame`) that TextArea, DateField and Select also use; Button (password toggle, clear button).
