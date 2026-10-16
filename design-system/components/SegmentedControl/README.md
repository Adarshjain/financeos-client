# SegmentedControl

Two to four mutually exclusive views of the same content, shown side by side: Debit | Credit, List | Calendar.

## Use
- The active segment is `ink` fill with `bg-surface` text.
- Use it for switching how something is shown, or for a two-way choice at the top of a form. Field-level single choices are Selects.

## Props
- `options: Array<SegmentedControlOption<T> | T>`: array of options (either strings or `{ value, label, icon?, disabled? }` objects).
- `value?: T`: controlled value of the active segment.
- `defaultValue?: T`: initial value when uncontrolled. When omitted, nothing is initially selected and the first option is tabbable.
- `onValueChange?: (value: T) => void`: callback fired when a segment is selected.
- `fullWidth?: boolean`: whether segments flex to fill the full container width (`default: false`).
- `disabled?: boolean`: whether the whole control is disabled (`default: false`).
- `className?: string`: additional class name for the wrapper.
- `aria-label?: string`: accessible label for the radio group (defaults to `'Options'`).

## Variants
- Two or three options (e.g. Debit/Credit, Preset/Single date/Range).
- Options with icons (`icon?: React.ReactNode`).
- Full width (`fullWidth={true}`).
- States: default (unselected with first option tabbable), selected, disabled control, disabled individual option.

## Built from
Native buttons with radio group semantics, Icon (in option icons).
