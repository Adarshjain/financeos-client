# MonthCalendar

The monthly calendar grid for overview event bars or date picking.

## Use
- **Events mode (`mode="events"`)**: seven columns with weekday overlines (Monday first). Each event is a 6px bar coloured by semantic tone: `positive`, `warning`, `info`, `danger`, `brand`. Today is `brand-tint`. Tapping a day triggers `onSelectDay`.
- **Picker mode (`mode="picker"`)**: month navigation header with formatted English month and year (`formatMonth`), 7-column weekday headers, Button day cells with hover and selection styling, range highlight (`bg-brand-tint`), disabled states for dates outside `minDate` or `maxDate`, and optional footer with Today and Clear buttons. Takes and emits ISO `yyyy-mm-dd` strings.

## Props
- `mode`: `'events' | 'picker'` (default: `'events'`).
- `weekdays`: array of weekday strings (default from `weekdayLetters()`).
- `today`: ISO `yyyy-mm-dd` string passed from caller (no device clock reads).
- `days`: array of `CalendarDay` (`day`, `today`, `selected`, `events`, `disabled`).
- `onSelectDay`: callback `(day: number) => void`.
- `selectedDay`: number, currently selected day in events mode.
- `borderTop`: boolean (default: `true`).
- `month`, `defaultMonth`, `onMonthChange`: visible calendar month (ISO `yyyy-mm-01`).
- `value`, `defaultValue`, `onValueChange`: ISO string or `{ start, end }` range.
- `selectedDate`, `startDate`, `endDate`, `minDate`, `maxDate`: ISO `yyyy-mm-dd` strings.
- `onSelectDate`: callback `(iso: string) => void`.
- `showFooter`: boolean, renders Today and Clear buttons.
- `onToday`, `onClear`: footer action callbacks.

## Built from
Button, Icon, Card (container in overview), Dinero utils (`formatMonth`, `weekdayLetters`).

## Variants
- Events grid (overview with event tone indicators).
- Picker (single date selection).
- PickerRange (date range selection with in-range tint).
- PickerMinMax (with min and max constraints).
- PickerWithFooter (with Today and Clear action footer).
