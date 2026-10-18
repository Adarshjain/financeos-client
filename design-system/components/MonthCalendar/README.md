# MonthCalendar

The month grid: the Upcoming calendar with event chips, or the date picker inside DateField.

## Use
- **Events mode (`mode="events"`)**: the Upcoming calendar (`D-upcoming-calendar`, `P-upcoming-calendar`). Seven columns under "Mon"…"Sun" overlines, whole Monday-first weeks: days of the neighbouring months fill the first and last week, drawn on `bg-sunken` with the number in `line-heavy`, with no events and not selectable. Cells are `space-56` tall on phone and `space-96` from `lg`, padding `space-4` (phone) / `space-6` (desktop), number `caption` bold `ink-3`. Today is `brand-tint` with "13 · today" in `brand-strong`.
  - **Chips**: each event sits on its day as a chip, `caption` bold, truncated, `radius-xs`, `space-2`/`space-6` padding, coloured by tone: `danger` (overdue), `warning` (due soon), `info` (lending), `positive` (money in, `positive-strong` text), `neutral` (scheduled, `line-soft` with `neutral-ink`), `brand` (default). Below `lg` a chip is a 6px bar of its tint with no label.
  - Up to `maxEventsPerDay` chips (default 3), then "+N more" in `ink-3` (desktop only).
  - Clicking a day (or a chip on it) or pressing Enter or Space selects it and emits its ISO date through `onValueChange`; the selected day has a 1px inset `brand` ring. The page shows that day's items itself.
  - The month title, ‹ Today › buttons, month summary and legend belong to the page, not the calendar.
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
- `weekdays`: weekday labels, Monday first (default "Mon"…"Sun" from `weekdayNamesShort()` in events mode, "M"…"S" from `weekdayLetters()` in picker mode).
- `events` (events mode): `{ id, date: 'yyyy-mm-dd', label, tone? }[]`; events outside the shown month are not drawn.
- `maxEventsPerDay` (events mode): chips per day before "+N more" (default 3).
- `moreLabel` (events mode): `(count) => ReactNode`, default "+2 more".
- `todayLabel` (events mode): the word after today's number, default "today".
- `borderTop`: boolean (default: `true`).
- `showFooter`: boolean, renders Today and Clear buttons.
- `onToday`, `onClear`: footer action callbacks.

## Built from
Button, Icon, Card (container in overview), Dinero utils (`formatMonth`, `monthNames`, `monthNamesShort`, `weekdayLetters`, `weekdayNamesShort`).

## Variants
- Events (month overview with event chips; bars on phone).
- Picker (single date selection).
- PickerRange (date range selection with in-range tint).
- PickerMinMax (with min and max constraints).
- PickerWithFooter (with Today and Clear action footer).
