# TextArea

A labelled multi-line field for notes and descriptions.

## Use
- Same label, helper and error as TextField. Starts exactly as tall as a TextField (`control-lg`, one line) and grows a line at a time as the text wraps or new lines are added, up to 8 lines (or `maxRows`), then scrolls.
- The user can also drag the bottom-right corner to make it taller (vertical resize only).
- No character counter unless the server enforces a limit.

## Props
- `label?: React.ReactNode`: field label above the input.
- `helper?: React.ReactNode`: helpful hint text below the input.
- `error?: React.ReactNode`: error message below the input.
- `optional?: boolean`: shows "(Optional)" next to the label.
- `minRows?: number`: minimum visible rows (default `1`).
- `maxRows?: number`: maximum visible rows before scrolling (default `8`).
- `className?: string`: class applied to the FieldFrame wrapper.
- `controlClassName?: string`: custom class applied to the `<textarea>` element.
- `onValueChange?: (value: string) => void`: callback with textarea value on change.
- Standard `<textarea>` HTML attributes (`rows`, `placeholder`, `disabled`, `value`, `defaultValue`, etc.).

## Variants
- Default, filled, optional, with helper, max rows cap, error, disabled.

## Built from
The shared field frame (`FieldFrame`) that TextField uses.
