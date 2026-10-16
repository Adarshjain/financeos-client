# DateField: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/DateField/DateField.stories.tsx`, `src/components/ds/DateField/DateField.tsx`

## Change (7)

- [ ] **f8caf85e4** · DateField writes its sheet titles and range placeholder
  - Now: 'Select date range' / 'Select date' are the sheet titles when `label` is not a string (DateField.tsx:436-441). The range input placeholder is fixed `'dd/mm/yyyy – dd/mm/yyyy'` (:420). The calendar button label `'Open calendar'` (:381) is copy too.
  - Do: Your rule (thread d62ae540, 2026-10-16): menus, dropdowns and selects never open as a sheet on phones; they look and work like a normal dropdown at every size. DateField's calendar opens in a Popover at every size, so the sheet titles ('Select date', 'Select date range') go. The range placeholder stays.
- [ ] **f4552f875** · DateField reads the device clock for Today
  - Now: `getTodayStr` and the initial calendar month use `new Date()` (DateField.tsx:108-113, 192). The app wants IST business time, and the consumer cannot give 'today'.
  - Do: Add `today?: string` (ISO). When set, use it for the Today button and the starting month. FinanceOS passes `AppTime`'s IST date.
  ```tsx
  <DateField today={istToday} />
  ```
- [ ] **f2d7599cf** · DateField's rest props are typed as empty
  - Now: `DateFieldProps` has no native input attributes, so `...props` (DateField.tsx:115-139, spread at :429) is typed `{}` and `name`, `onBlur`, `required`, `autoComplete` fail type checks. `ref` goes to the input, which is right.
  - Do: Extend `DateFieldProps` with `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'|'defaultValue'|'onChange'|'placeholder'|'type'>`.
  ```tsx
  <DateField name="due" onBlur={validate} />
  ```
- [ ] **fb19972d3** · DateField range state is not fully controlled
  - Now: Handlers always write `internalStart`/`internalEnd` even when `startDate`/`endDate` are controlled (DateField.tsx:173-189), `isOpen` has no `open`/`onOpenChange`, and `onValueChange` fires for partial text like '1'. The displayed value does use the controlled props when present.
  - Do: Add `open`/`defaultOpen`/`onOpenChange` through `useControllableState`. Use `value`/`onValueChange` with `{ start, end }` for range. Call `onValueChange` only when the typed text is a full valid date.
  ```tsx
  <DateField range value={{ start, end }} onValueChange={setRange} open={o} onOpenChange={setO} />
  ```
- [ ] **f6c1631a7** · DateField ignores placeholder in range mode
  - Now: `placeholder={range ? 'dd/mm/yyyy – dd/mm/yyyy' : placeholder}` (DateField.tsx:420) throws away a given placeholder in range mode.
  - Do: Use the passed `placeholder` when given. The default is `dd/mm/yyyy`, or `dd/mm/yyyy – dd/mm/yyyy` in range mode. There is no `format` prop (G10: the display is always dd/mm/yyyy). _(per G10)_
- [ ] **fb8ad7219** · DateField AllVariants has a hand-built wrapper
  - Now: `<div className="space-y-space-24 max-w-lg font-text">` in DateField.stories.tsx:46.
  - Do: Delete the story, and use `parameters.layout: 'padded'` plus a decorator for width.
  ```tsx
  decorators: [(S) => <div className="max-w-sm"><S /></div>]
  ```
- [ ] **f91a26759** · DateField stories send changes only to updateArgs
  - Now: `onValueChange`/`onRangeChange` go only to `updateArgs` (DateField.stories.tsx:34-35), so no Actions entry.
  - Do: Add `onValueChange: fn()` to meta `args` and keep `useArgs` for the sync.
  ```tsx
  args: { onValueChange: fn() }
  ```

## Owner's own call (4)

- [ ] **ff40ccbbd** · DateField's public value is a formatted string
  - Do: Owner: Lets go with generic version suggestion but with one change, lets not try to duplicate date formatting logic in two places i.e. Dinero and the App. Let Dinero expose set of utils which will include date utils which app can use. This way logic stays in one place.
  - Generic version the owner refers to: Move the date helpers to a small `dateFormat.ts` beside the component. Change the props to ISO strings (`value`, `minDate`, `maxDate`, `startDate`, `endDate`) and format only for display. The app converts if it must.
  ```tsx
  <DateField value="2026-10-13" minDate="2026-01-01" onValueChange={setIso} />
  ```
- [ ] **f70c5026e** · DateField stories pass undefined value and AllVariants is fixed
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fb3b2609a** · DateField AllVariants duplicates stories; calendar never shown open
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fb2a2b7f1** · DateField stories have no play function
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (1)

- **f577958eb** · DateField is fixed to dd/mm/yyyy: dd/mm/yyyy is the app-wide display format (RULES §4.4). The value itself becomes ISO under the logic decision.

## Ignore: the claim was wrong (2)

- fb4094c1d (DateField range logic sits inside the component), faa08065a (DateField's second month is hidden below lg)

## README

Update `design-system/components/DateField/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
