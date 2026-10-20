# SettingsToggle

A settings row combining a label, optional description, optional error line, and a trailing Switch. Built from Dinero's `ListRow`, `Switch`, and `Text`.

## Props
- `label`: `ReactNode`
- `description`: `ReactNode`
- `error`: `ReactNode`
- `checked`: `boolean`
- `defaultChecked`: `boolean`
- `onCheckedChange`: `(checked: boolean) => void`
- `disabled`: `boolean` (default `false`)
- `borderTop`: `boolean` (default `false`)

## Built from
Dinero components only: `ListRow`, `Switch`, `Text`.

## Variants
Default, WithDescription, On, Disabled, WithError. The label and description always wrap (ListRow `wrap`), as on the notifications board.
