# TextField

A labelled single-line input. Label above in `ink-2` 12px bold; helper or error below.

## Use
Standard text input for forms, logins, and values.

## Props
- `size?: 'md' | 'lg'`: height and padding scale (default `'lg'` is `control-lg`; `'md'` is `control-md`).
- `variant?: 'default' | 'embedded'`: visual variant (`embedded` removes focus ring for use inside list overlays like Select).
- `label?: React.ReactNode`: field label above the input.
- `helper?: React.ReactNode`: helpful hint text below the input.
- `error?: React.ReactNode`: error message below the input.
- `optional?: boolean`: shows "(Optional)" next to the label.
- `clearable?: boolean`: shows an integrated clear button when text is present.
- `clearLabel?: string`: aria-label for clear button (default `'Clear'`).
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
- States: default, filled, placeholder (`ink-4`), focus (2px `focus-ring`), error (`danger` border and message), disabled.
- Password input (`type="password"`) includes an integrated Show/Hide toggle button.
- Numeric inputs (`inputMode="decimal" | "numeric"` or `type="number"`) format with `tabular-nums`.
- Search input (`type="search"`) with search prefix and clear button.
- Embedded variant (`variant="embedded"`) inside dropdowns.

## Built from
The shared field frame (`FieldFrame`) that TextArea, DateField and Select also use; Button (password toggle, clear button); Icon.
