# DateField

The only date input. Shows and accepts dd/mm/yyyy, with a calendar in a Popover for picking.

## Use
- Typing: digits only, slashes added as you type (`13102026` → `13/10/2026`). Invalid dates show an error that says the format.
- Calendar: the calendar icon at the right opens a Popover with MonthCalendar; Today and Clear in its footer. On phone the calendar opens in a Dialog (bottom sheet).
- Range mode: two typed fields ("From", "To") sharing one calendar; the range shows as a `brand-tint` band.
- Never `<input type="date">`.

## Built from
TextField's field frame, Popover, Dialog (phone), MonthCalendar (from DateTile), Icon, Button.

## Variants
- Single date, date range, with min/max (days outside are greyed), error, disabled.
