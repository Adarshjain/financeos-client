# DateField

The only date input. Takes and emits ISO `yyyy-mm-dd` strings, displaying `dd/mm/yyyy` with a calendar in a Popover for picking.

## Use
- Typing: digits only, slashes added as you type (`13102026` → `13/10/2026`). Dispatches `onValueChange` only once a complete valid date is entered.
- Calendar: the calendar icon at the right opens a Popover with MonthCalendar; Today and Clear in its footer. Operates as a Popover at every size.
- Range mode: **one field** holding both dates, "01/10/2026 – 13/10/2026". Typing fills start then end; the calendar picks start on the first tap and end on the second, with the range as a `brand-tint` band. Shows two months side by side on desktop (`hidden lg:block`) and one on phone.
- Never `<input type="date">`.

## Props
- `value`, `defaultValue`, `onValueChange`: ISO string (`yyyy-mm-dd`) or `{ start?: string; end?: string }`.
- `range`: boolean, toggles range mode.
- `placeholder`: string (default `'dd/mm/yyyy'` or `'dd/mm/yyyy – dd/mm/yyyy'`).
- `minDate`, `maxDate`: ISO `yyyy-mm-dd` bounding dates.
- `today`: ISO `yyyy-mm-dd` string passed from caller (no device clock reads).
- `open`, `defaultOpen`, `onOpenChange`: controlled/uncontrolled Popover state.
- `name`, `disabled`, `optional`, `label`, `helper`, `error`: form and field metadata.

## Built from
FieldFrame, Popover, MonthCalendar, Icon, Button.

## Variants
- Single date, date range, with min/max (days outside are disabled), error, disabled, open.
