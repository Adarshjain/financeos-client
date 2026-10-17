# MonthCalendar

The monthly calendar grid for overview event bars or date picking.

## Use
- **Events mode (`mode="events"`)**: seven columns with weekday overlines (Monday first). Each event is a 6px bar coloured by semantic tone: `positive`, `warning`, `info`, `danger`, `brand`. Today is `brand-tint`. Tapping a day triggers `onSelectDay`.
- **Picker mode (`mode="picker"`)**: in-popup month and year navigation with three views:
  - **Days view (default)**: header with ‹, month Button ("October", `aria-label="Choose month"`), year Button ("2026", `aria-label="Choose year"`), and ›. Tapping month switches to the months view with `browseYear` set to shown year. Tapping year switches to the years view with `pageStart = shown year - (shown year % 12)`. 7-column weekday headers and Button day cells with hover and selection styling, range highlight (`bg-brand-tint`), disabled states for dates outside `minDate` or `maxDate`, and optional footer with Today and Clear buttons. Takes and emits ISO `yyyy-mm-dd` strings (or `{ start, end }` range). ‹ is disabled when previous month ends before `minDate`; › is disabled when next month starts after `maxDate`.
  - **Months view**: header with ‹, `browseYear` Button (`aria-label="Choose year"`, tapping opens years view), and ›. 3×4 grid of short month names (`Jan`…`Dec`). Tapping a month sets the shown month to `browseYear`-month, emits `onMonthChange`, and returns to days view. A month is disabled when every day of it, in `browseYear`, is outside `[minDate, maxDate]`. ‹ is disabled when `browseYear - 1` is before `minDate`'s year; › is disabled when `browseYear + 1` is after `maxDate`'s year.
  - **Years view**: header with ‹, plain text "YYYY – YYYY" (not a button), and ›. 3×4 grid of 12 years (`pageStart`…`pageStart + 11`). Tapping a year sets `browseYear` and switches to the months view without changing the shown month. A year is disabled when the whole year is outside `[minDate, maxDate]`. ‹ is disabled when `pageStart - 1` is before `minDate`'s year; › is disabled when `pageStart + 12` is after `maxDate`'s year.

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
Button, Icon, Card (container in overview), Dinero utils (`formatMonth`, `monthNames`, `monthNamesShort`, `weekdayLetters`).

## Variants
- Events grid (overview with event tone indicators).
- Picker (single date selection).
- PickerRange (date range selection with in-range tint).
- PickerMinMax (with min and max constraints).
- PickerWithFooter (with Today and Clear action footer).
