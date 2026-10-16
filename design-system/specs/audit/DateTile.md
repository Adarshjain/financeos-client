# DateTile: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/DateTile/DateTile.stories.tsx`, `src/components/ds/DateTile/DateTile.tsx`

## Change (17)

- [ ] **f32058538** · Calendar event kinds are bill / in / emi
  - Now: `CalendarEventKind = 'bill' | 'in' | 'emi'` (DateTile.tsx:37) names FinanceOS ideas. The README even says bills are `warning`, money in is `positive`, EMIs are `info`.
  - Do: Replace `kind` with `tone?: 'brand'|'positive'|'warning'|'info'|'danger'` on `CalendarEvent`. The app maps bill/in/emi to a tone before passing `days`.
  ```tsx
  interface CalendarEvent { tone?: 'positive'|'warning'|'info'|'danger'|'brand'; label?: string }
  ```
- [ ] **fd60076a5** · MonthCalendar lives inside the DateTile file
  - Now: `MonthCalendar` (DateTile.tsx:52-453) is a full date picker plus an events grid in a file named for a 40px day tile. `DateField` imports it from there, and its README has one line on it. Only one story (`Calendar`) shows it, and that one is the events grid.
  - Do: Move `MonthCalendar` to `src/components/ds/MonthCalendar/` with its own README and stories (`Events`, `Picker`, `Range`). Keep `DateTile` as the small tile. Re-export from `@/components/ds`.
- [ ] **ffe8254ed** · Month names are hard-coded in English
  - Now: `MONTH_NAMES` (DateTile.tsx:93-106) is a fixed English list used in the picker header at :361.
  - Do: MonthCalendar takes month names from the Dinero util `formatMonth(iso)` instead of a hard-coded array in the component; still English. _(per G10)_
- [ ] **f7ddf0a4c** · Weekday letters default to English M T W T F S S
  - Now: `weekdays` defaults to `['M','T','W','T','F','S','S']` (DateTile.tsx:137), in both events and picker mode.
  - Do: MonthCalendar's default weekday letters come from the Dinero util `weekdayLetters()` (English, Monday first) instead of a local constant; the `weekdays` prop override stays. _(per G10)_
- [ ] **fc4103422** · Event colours are chosen by domain kind
  - Now: The event bar colour is picked with `ev.kind === 'bill' && 'bg-warning'`, `'in'` -> `bg-positive`, `'emi'` -> `bg-info` (DateTile.tsx:229-231). Any other kind gets no colour at all.
  - Do: Same fix as the `kind` finding: use a `tone` field and look it up in a small table `{ positive:'bg-positive', warning:'bg-warning', info:'bg-info', danger:'bg-danger', brand:'bg-brand' }`. Default tone `brand`.
- [ ] **f04e2bc03** · Dates are dd/mm/yyyy strings, not Date objects
  - Now: `selectedDate`, `startDate`, `endDate`, `minDate`, `maxDate` and `onSelectDate` all use `dd/mm/yyyy` strings (DateTile.tsx:73-84), parsed and written by `parseDateStr`/`formatDateStr` (:108-131). That is the FinanceOS text format baked into the calendar.
  - Do: Make MonthCalendar and DateTile take and emit ISO `yyyy-mm-dd` strings, not `Date` objects: `value?: string`, `defaultValue`, `onValueChange(iso: string)`, `range?: { from?: string; to?: string }`, `minDate?: string`, `maxDate?: string`. Display uses `formatDate(iso,'input')` and parsing uses `parseDateInput` from the Dinero utils (G10), so no date-format logic is duplicated. _(per G10)_
- [ ] **fc0ff52f2** · "Today" is read from the system clock
  - Now: `const today = new Date()` (DateTile.tsx:267) decides the today ring and the init month (:162). A test or an app that uses the IST clock cannot change it.
  - Do: Add `today?: string` (ISO `yyyy-mm-dd`) to MonthCalendar and DateTile, used for the today ring and the starting month. Nothing reads the device clock (no `new Date()` default); the app passes `todayISO('Asia/Kolkata')`. _(per G10)_
- [ ] **f6ecc1627** · mode="events" can fall into picker mode
  - Now: `isEventsMode = mode === 'events' && days.length > 0 && controlledYear === undefined` (DateTile.tsx:160). With `mode="events"` and no days (a month with nothing in it), it renders the picker instead.
  - Do: Let `mode` decide alone: `events` always renders the events grid, even with zero days; `picker` always renders the picker. Drop the `days.length` and `year` checks.
- [ ] **f74da0962** · MonthCalendar `month` is a number, with no defaultMonth
  - Now: `year` and `month` are controlled, with a hidden internal copy and no `defaultYear`/`defaultMonth` (DateTile.tsx:163-167). `month` is a 0-based number on `MonthCalendar` (:70) but a string on `DateTile` (:13), so one name has two meanings in the file.
  - Do: Use one `month?: string` (ISO `yyyy-mm-01`, the visible month) plus `defaultMonth?: string` and `onMonthChange(month: string)`, all ISO strings, not `Date`. Rename the `DateTile` text prop to `monthLabel` so `month` always means the calendar month. _(per G10)_
- [ ] **fecabbb76** · Picker day cells are raw <button> elements
  - Now: The picker draws its day cells with `<button>` and hand-written classes (DateTile.tsx:405-422). The arrows and footer above them use `Button`.
  - Do: Render each day with `Button`: `variant={selected ? 'primary' : 'ghost'}`, `size="md"`, `disabled` for out-of-range days. Put the in-range tint and today ring in a `className` on top.
  ```tsx
  <Button variant={selected ? 'primary' : 'ghost'} size="md" disabled={off}>{day}</Button>
  ```
- [ ] **fd977c479** · DateTile stories have no argTypes; Calendar ignores args
  - Now: `meta` (DateTile.stories.tsx:7-13) has no `argTypes`, so `day` and `month` have no controls. `Calendar` (:39-45) uses `render: () => ...`, so no control reaches it.
  - Do: Add `argTypes: { day: { control: 'number' }, month: { control: 'text' } }`. Make `Calendar` an args story on its own meta (`component: MonthCalendar`) so `weekdays`, `selectedDay`, `borderTop` are controls.
- [ ] **fa265d9fe** · Picker mode has no story
  - Now: The stories file has `Tile`, `Calendar` and `AllVariants` only (verified). Picker mode, `year`/`month`, `selectedDate`, `startDate`/`endDate`, `minDate`/`maxDate`, `showFooter`, `onToday`, `onClear`, `onSelectDate` appear in none.
  - Do: Add `Picker`, `PickerRange`, `PickerMinMax` and `PickerWithFooter` stories on a `MonthCalendar` meta. Use `onSelectDate: fn()`, `onToday: fn()`, `onClear: fn()`.
- [ ] **fb9e9ea99** · AllVariants uses hand-built wrapper divs and headings
  - Now: Lines 49-69 use `<div className="flex flex-col gap-space-16 max-w-sm">` and two `<div className="text-caption font-semibold text-ink-3 mb-space-6">` headings.
  - Do: Remove with `AllVariants`. If a width is needed, use a decorator: `decorators: [(Story) => <div className="max-w-sm"><Story /></div>]`. Explanations go in `parameters.docs.description.story`.
- [ ] **f9177df54** · sampleDays builds data inside the story file
  - Now: `sampleDays` (DateTile.stories.tsx:25-37) uses `Array.from` with `if (day === 5)` branches.
  - Do: Write it as a plain literal in `args.days` (a few entries with `tone`), or as a tiny helper in a `.fixtures.ts` file. No branches.
- [ ] **f336691d0** · No callbacks are wired in DateTile stories
  - Now: `onSelectDay`, `onSelectDate`, `onMonthChange`, `onToday` and `onClear` are never given to any story (verified).
  - Do: Add them to the meta `args` as `fn()` from `storybook/test`, so clicks show in the Actions panel.
  ```tsx
  args: { onSelectDay: fn(), onMonthChange: fn() }
  ```
- [ ] **f45eb81ee** · Calendar story is typed for a different component
  - Now: `Calendar` is `StoryObj<typeof MonthCalendar>` while `meta` is `Meta<typeof DateTile>` (DateTile.stories.tsx:7-16, 39). Its `render` wraps the calendar in `<Card className="max-w-sm p-0 overflow-hidden">` (:41).
  - Do: Give `MonthCalendar` its own meta (`component: MonthCalendar`, `title: 'DS/Data display/MonthCalendar'`). Put the card frame in a decorator, or drop it.
- [ ] **fc95eb79b** · AllVariants repeats other stories, with FinanceOS sample text
  - Now: `AllVariants` shows the same content as `Tile` and `Calendar`. The sample labels are "Car Loan EMI" and "Amex Bill" (DateTile.stories.tsx:28, 34).
  - Do: Delete the `AllVariants` story in DateTile.stories.tsx; autodocs replaces it and there is no controls panel on docs. Any FinanceOS sample text stays only in single stories. _(per G9)_

## Owner's own call (3)

- [ ] **fe8557949** · Event cell height borrows the app-bar token
  - Do: Event cell height uses the generic `min-h-space-56` (approved step, G8); no app-bar or calendar-cell named token. Do not add any component-named token.
- [ ] **f16f9d878** · AllVariants hard-codes markup in render
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f6f0f9756** · No play function for the calendar
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (4)

- **f3a3a01e7** · Month arrows have fixed English labels: Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **f46d73bfe** · Footer Today / Clear cannot be relabelled: Generic control wording that any app would use; fine as a default.
- **fd3bceb81** · Week always starts on Monday: Monday-first weeks are the convention for this app; no option needed yet.
- **f2bff36f3** · DateTile and picker widths are fixed: Leave as is (owner approved Keep).

## README

Update `design-system/components/DateTile/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
