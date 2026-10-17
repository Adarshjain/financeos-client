# MonthCalendar

The monthly calendar grid for overview event bars or date picking.

## Use
- **Events mode (`mode="events"`)**: seven columns with weekday overlines (Monday first). Each event is a 6px bar coloured by semantic tone: `positive`, `warning`, `info`, `danger`, `brand`. Today is `brand-tint`. Tapping a day triggers `onSelectDay`.
- **Picker mode (`mode="picker"`)**: navigation header (‹ · Month dropdown · Year dropdown · ›) with Popover dropdowns for month and year, 7-column weekday headers, Button day cells with hover and selection styling, range highlight (`bg-brand-tint`), disabled states for dates outside `minDate` or `maxDate`, and optional footer with Today and Clear buttons. Takes and emits ISO `yyyy-mm-dd` strings (or `{ start, end }` range).
  - **Month options**: all 12 month names (`monthNames()`). A month is disabled when every day of that month, in the shown year, is outside `[minDate, maxDate]`.
  - **Year options**: newest first. Spans from `maxDate`'s year down to `minDate`'s year when both are set; when a bound is missing, spans from `today` + 10 down to `today` − 100. A year is disabled when the whole year is outside `[minDate, maxDate]`. Choosing a year where the current month is out of range moves the month to the nearest allowed one.
  - **Navigation arrows**: ‹ is disabled when the previous month ends before `minDate`; › is disabled when the next month starts after `maxDate`.

## Props
- `mode`: `'events' | 'picker'` (default: `'events'`).
- `range`: boolean (picker mode only), enables range selection emitting `{ start, end }`.
- `value`, `defaultValue`, `onValueChange`: ISO string `yyyy-mm-dd` or `{ start?: string; end?: string }`.
- `today`: ISO `yyyy-mm-dd` string passed from caller (required, no device clock reads).
- `month`, `defaultMonth`, `onMonthChange`: visible calendar month (ISO `yyyy-mm-01`).
- `minDate`, `maxDate`: ISO `yyyy-mm-dd` strings.
- `weekdays`: array of weekday strings (default from `weekdayLetters()`).
- `days`: array of `CalendarDay` (`day`, `today`, `selected`, `events`, `disabled`).
- `onSelectDay`: callback `(day: number) => void`.
- `selectedDay`: number, currently selected day in events mode.
- `borderTop`: boolean (default: `true`).
- `showFooter`: boolean, renders Today and Clear buttons.
- `onToday`, `onClear`: footer action callbacks.

## Built from
Button, Icon, Popover, Card (container in overview), Dinero utils (`formatMonth`, `monthNames`, `weekdayLetters`).

## Variants
- Events grid (overview with event tone indicators).
- Picker (single date selection).
- PickerRange (date range selection with in-range tint).
- PickerMinMax (with min and max constraints).
- PickerWithFooter (with Today and Clear action footer).
