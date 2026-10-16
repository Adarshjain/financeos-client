# TextField: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/TextField/TextField.stories.tsx`, `src/components/ds/TextField/TextField.tsx`

## Change (6)

- [x] **f30476148** · TextField hard-codes the rupee sign in kind="amount"
  - Now: `kind` allows `'amount'` (line 9) and line 66 sets the prefix to `₹` when no `prefix` is passed. Amount fields also get `tabular-nums` (line 108). A generic input should not know a currency.
  - Do: Remove `'amount'` from `kind`. The app passes `prefix="₹"` and `inputMode="decimal"`. Apply `tabular-nums` whenever `inputMode` is `decimal`/`numeric` or `type="number"`.
  ```tsx
  <TextField label="Total due" prefix="₹" inputMode="decimal" />
  ```
- [x] **f3d5f32bc** · TextField has both kind and type for the same idea
  - Now: Lines 52-60 pick `kind` or work it out from `type`. `kind: 'amount'` has no matching `type`, and `kind` and `type` can disagree.
  - Do: Delete `kind`. Use the native `type` only (password gets the toggle). The app sets `inputMode` for amounts.
- [x] **f8769cff1** · TextField className styles the wrapper, not the input
  - Now: `className` goes on `FieldFrame` (line 76), so the input box cannot be styled from outside.
  - Do: Same contract as TextArea: `className` on the wrapper plus `controlClassName` for the input box.
  ```tsx
  <TextField className="max-w-md" controlClassName="font-mono" />
  ```
- [x] **fce805d09** · TextField has no onValueChange
  - Now: The input passes `onChange` straight through (line 103). SearchField and SegmentedControl give `onValueChange(value)`.
  - Do: Add `onValueChange?: (value: string) => void`, called with the native `onChange`. The native `value`/`defaultValue` already work for controlled and uncontrolled use, so no hook is needed.
- [x] **fca087bd9** · TextField stories: Text and Placeholder overlap
  - Now: `Text`, `Amount`, `Password`, `Placeholder`, `WithHelper`, `ErrorState`, `Disabled` are one story per state, which is right. `Text` (a filled value) and `Placeholder` (empty with hint) differ a little but `Placeholder` also sets `optional`.
  - Do: Rename `Text` to `Filled`, keep `Placeholder` with only `placeholder` set, and add an `Optional` story. After the amount change, `Amount` becomes `WithPrefix` (`prefix: '₹'`).
- [x] **fa5bc7497** · TextField story onChange is not logged as an action
  - Now: The render function sends `onChange` only to `updateArgs` (line 31).
  - Do: Add `args: { onValueChange: fn() }` and call it in the render handler.
  ```tsx
  args: { onValueChange: fn() }
  ```

## Owner's own call (2)

- [x] **fde6b19e9** · TextField AllVariants is hard-coded with its own wrapper
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [x] **f9858604b** · TextField has no interaction demo
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **f160f7414** · TextField password toggle words cannot be changed: Generic control wording that any app would use; fine as a default.
- **f62cf81e9** · TextField stories use FinanceOS sample text: Leave as is (owner approved Keep).

## README

Update `design-system/components/TextField/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
