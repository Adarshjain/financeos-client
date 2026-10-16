# TextField

A labelled single-line input. Label above in `ink-2` 12px bold; helper or error below.

## Use
Standard text input for forms, logins, and values.

## Props
- `label?: React.ReactNode`: field label above the input.
- `helper?: React.ReactNode`: helpful hint text below the input.
- `error?: React.ReactNode`: error message below the input.
- `optional?: boolean`: shows "(Optional)" next to the label.
- `prefix?: React.ReactNode`: leading glyph or currency sign (e.g. "₹").
- `suffix?: React.ReactNode`: trailing content.
- `className?: string`: class applied to the FieldFrame wrapper.
- `controlClassName?: string`: custom class applied to the `<input>` element.
- `onValueChange?: (value: string) => void`: callback with input value on change.
- Standard `<input>` HTML attributes (`type`, `inputMode`, `placeholder`, `disabled`, `value`, `defaultValue`, etc.).

## Variants
- States: default, filled, placeholder (`ink-4`), focus (2px `focus-ring`), error (`danger` border and message), disabled.
- Password input (`type="password"`) includes an integrated Show/Hide toggle button.
- Numeric inputs (`inputMode="decimal" | "numeric"` or `type="number"`) format with `tabular-nums`.

## Built from
The shared field frame (`FieldFrame`) that TextArea, DateField and Select also use; Button (password toggle).
