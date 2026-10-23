# Keypad

A number pad that builds a piece of text: digits, a decimal point, backspace and optional operator keys. The amount fields use it on phone, inside a sheet, so the OS keyboard never opens (owner, 2026-10-23). Status: **Ready for review** (new component, 2026-10-23).

## Use
- Phone sheet content under a big figure the page draws; the page decides what the text means (money, quantity) and when it is valid.
- Keys press like Button `secondary` `xl`; digits and the decimal point in `title` text, backspace is an Icon.
- Layout: rows of `1 2 3`, `4 5 6`, `7 8 9`, `. 0 ⌫`, keys `space-8` apart. With `operators`, they fill a fourth column top to bottom.
- Typing rules: one decimal point per number (a leading `.` becomes `0.`), a lone `0` is replaced by the next digit, an operator replaces a trailing operator and is ignored on empty text, backspace removes the last character.

## Props
- `value?: string`, `defaultValue?: string`, `onValueChange?: (value: string) => void`
- `operators?: { value: string; label?: string }[]`: up to four, shown as the last column (default none: a three-column pad)
- `backspaceLabel?: string` (default "Backspace")
- Native `<div>` attributes and ref; `className` for layout only.
- `applyKeypadKey(value, key, operators)` is exported for callers that need the same rules.

## Variants
None. Three or four columns come from `operators`.

## Built from
Button, Icon (`backspace`), Text.
