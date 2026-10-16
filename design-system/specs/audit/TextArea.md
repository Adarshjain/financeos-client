# TextArea: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/TextArea/TextArea.stories.tsx`, `src/components/ds/TextArea/TextArea.tsx`

## Change (5)

- [x] **f569d3865** · TextArea sizes itself with hard-coded pixel numbers
  - Now: `adjustHeight` uses `lineHeight = 18` and `paddingBorder = 18` (lines 73-76) and sets `style.height` by hand (lines 71, 81-82). If the type size, padding token or border changes, the height maths is wrong.
  - Do: Read the real values at run time with `getComputedStyle(textarea)` (`lineHeight`, `paddingTop/Bottom`, border widths) and compute min and max from those. Or use CSS `field-sizing: content` with `min-height`/`max-height` in `lh` units where browsers allow it.
  ```tsx
  const cs = getComputedStyle(el); const line = parseFloat(cs.lineHeight);
  ```
- [x] **f087759b7** · TextArea cannot style the control itself
  - Now: `className` goes to the `FieldFrame` wrapper (line 120). The `<textarea>` has no way to take a class from the app. The same is true of TextField.
  - Do: Keep `className` on the wrapper and add `controlClassName` for the `<textarea>` / `<input>`, in the same way on TextField, SearchField, DateField and Select.
  ```tsx
  <TextArea className="max-w-md" controlClassName="font-mono" />
  ```
- [x] **fb41e9eed** · TextArea has no onValueChange
  - Now: `handleChange` (lines 107-110) only forwards the native `onChange`. SearchField and SegmentedControl give `onValueChange(value)`.
  - Do: Add `onValueChange?: (value: string) => void`, called alongside the native `onChange`. Same on TextField. No need for `useControllableState`: `value`/`defaultValue` already pass straight to the native element.
  ```tsx
  <TextArea value={v} onValueChange={setV} />
  ```
- [x] **f4d6d251a** · TextArea has overlapping stories
  - Now: `Filled` and `GrownToThreeLines` differ only in the length of `defaultValue`. `WithHelper` also sets `optional`, so it shows two things at once.
  - Do: Merge into `Filled` (multi-line `defaultValue`). Make `WithHelper` only set `helper`, and add an `Optional` story. Add `MaxRows` with long text and `maxRows: 3` to show the cap.
- [x] **f970f4d14** · TextArea story onChange is not logged as an action
  - Now: The render function sends `onChange` only to `updateArgs` (line 28). Nothing shows in the Actions panel.
  - Do: Add `args: { onValueChange: fn() }` and call `args.onValueChange?.(v)` inside the render's handler once `onValueChange` exists (or call `args.onChange?.(e)` now).
  ```tsx
  onValueChange={(v) => { args.onValueChange?.(v); updateArgs({ value: v }); }}
  ```

## Owner's own call (2)

- [x] **fa89b7d37** · TextArea AllVariants is hard-coded and growth props have no controls
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **fbb4bd2fd** · TextArea has no demo of auto-grow
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **f0af02d8b** · TextArea resize behaviour is fixed and one-way: No page needs this flexibility yet; add it when one does.
- **fbfdd9a8d** · TextArea stories use FinanceOS sample text: Leave as is (owner approved Keep).

## Superseded by a global rule: nothing to do beyond that rule (1)

- **f22c17569** · TextArea AllVariants story has its own wrapper and fixed fields: The AllVariants story is deleted (G9), so there is no `states` array to build; only the width decorator part remains, covered by single args-driven stories.

## README

Update `design-system/components/TextArea/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
