# DateField

The only date input. Shows and accepts dd/mm/yyyy, with a calendar in a Popover for picking.

## Use
- Typing: digits only, slashes added as you type (`13102026` → `13/10/2026`). Invalid dates show an error that says the format.
- Calendar: the calendar icon at the right opens a Popover with MonthCalendar; Today and Clear in its footer. On phone the calendar opens in a Dialog (bottom sheet).
- Range mode: **one field** holding both dates, "01/10/2026 – 13/10/2026", the way MUI, Ant Design and Airbnb do it. Typing fills the start then the end (the en dash is added for you); the calendar picks the start on the first tap and the end on the second, with the range as a `brand-tint` band. The calendar shows two months side by side on desktop and one on phone (in a Dialog).
- Never `<input type="date">`.

## Built from
TextField's field frame, Popover, Dialog (phone), MonthCalendar (from DateTile), Icon, Button.

## Variants
- Single date, date range, with min/max (days outside are greyed), error, disabled.
