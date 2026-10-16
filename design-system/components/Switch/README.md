# Switch

A bare switch control for toggling a boolean setting.

## Props
- `checked`: `boolean`
- `defaultChecked`: `boolean` (default `false`)
- `onCheckedChange`: `(checked: boolean) => void`
- `disabled`: `boolean` (default `false`)
- `name`: `string`
- `value`: `string`

## Use
- On is `brand`, off is `line-heavy`.
- For settings rows with title and description, use the `SettingsToggle` organism.

## Built from
Nothing else (a button with `role="switch"`).

## Variants
- Off, on, disabled off, disabled on.
